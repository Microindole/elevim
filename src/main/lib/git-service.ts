// src/main/lib/git-service.ts
import * as fs from 'node:fs';
import * as path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

// --- 定义更细致的 Git 状态类型 ---
export type GitStatus =
    | 'unmodified' // (通常我们不显式标记这个)
    | 'added'      // Staged Added (Index Added)
    | 'modified'   // Staged Modified (Index Modified)
    | 'deleted'    // Staged Deleted (Index Deleted)
    | 'renamed'    // Staged Renamed (Index Renamed) - 较复杂，暂简化
    | 'typechange' // Staged Typechange (Index Typechange) - 较复杂，暂简化
    | 'untracked'  // Untracked (Working directory new)
    | 'wd-modified'// Unstaged Modified (Working directory modified)
    | 'wd-deleted' // Unstaged Deleted (Working directory deleted)
    | 'wd-renamed' // Unstaged Renamed - 较复杂，暂简化
    | 'wd-typechange' // Unstaged Typechange - 较复杂，暂简化
    | 'conflicted'; // Unmerged / Conflicted

export type GitStatusMap = Record<string, GitStatus>;

let lastFolderPath: string | null = null;
let lastStatusMap: GitStatusMap = {};
let lastReadTime = 0;
const CACHE_DURATION = 1500; // 缓存时间可以稍短一点

export async function getGitStatus(folderPath: string): Promise<GitStatusMap> {
    const now = Date.now();
    if (folderPath === lastFolderPath && now - lastReadTime < CACHE_DURATION) {
        return lastStatusMap;
    }

    try {
        const gitDir = path.join(folderPath, '.git');
        try {
            await fs.promises.access(gitDir);
        } catch {
            lastFolderPath = folderPath;
            lastStatusMap = {};
            lastReadTime = now;
            return {};
        }

        // console.log(`Reading git status for: ${folderPath}`);
        const statusMatrix = await git.statusMatrix({ fs, dir: folderPath, http });
        const statusMap: GitStatusMap = {};

        /*
         * statusMatrix [filepath, head, workdir, stage]
         * Status codes:
         * 0: absent
         * 1: unchanged
         * 2: modified / added
         * 3: deleted? intent-to-add? (isomorphic-git docs are a bit unclear here, might need testing)
         *
         * Common Mappings (based on git status --porcelain v1):
         * Index Workdir Path
         * ??                0     2       0     -> untracked
         * ' M' (staged M)   1     1       2     -> modified
         * 'MM' (staged+wd)  1     2       2     -> modified + wd-modified (优先显示 staged)
         * ' M' (wd M)       1     2       1     -> wd-modified
         * ' A' (staged A)   0     1       2     -> added
         * 'AM' (stagedA+wdM)0     2       2     -> added + wd-modified (优先显示 staged)
         * ' D' (staged D)   1     0       0     -> deleted
         * ' D' (wd D)       1     0       1     -> wd-deleted
         * TODO: Handle Renamed (R), Copied (C), Conflicted (U) more specifically if needed.
         */
        statusMatrix.forEach(([filepath, head, workdir, stage]) => {
            const fullPath = path.join(folderPath, filepath);
            let fileStatus: GitStatus | null = null;

            // --- 暂存区状态优先 ---
            if (stage === 2) { // Index has changes (modified or added)
                if (head === 0) {
                    fileStatus = 'added'; // Staged Added (' A')
                } else if (head === 1) {
                    fileStatus = 'modified'; // Staged Modified (' M')
                }
                // Note: If workdir is also 2 ('AM', 'MM'), we still show 'added' or 'modified'
                // We could potentially create combined statuses like 'staged-modified-wd-modified' if needed
            } else if (stage === 0 && head === 1 && workdir === 0) {
                fileStatus = 'deleted'; // Staged Deleted (' D') - workdir absent, was present in head
            }
            // --- 如果暂存区无变化，检查工作区 ---
            else if (stage !== 2) { // Only check workdir if stage is clean (0 or 1)
                if (workdir === 2) {
                    if (head === 0 && stage === 0) { // Was absent, now exists in workdir, not staged
                        fileStatus = 'untracked'; // Untracked ('??')
                    } else if (head === 1 && (stage === 1 || stage === 0 /* stage can be 0 if reset */)) {
                        fileStatus = 'wd-modified'; // Working dir Modified (' M')
                    }
                } else if (workdir === 0 && head === 1 && (stage === 1 || stage === 0)) {
                    fileStatus = 'wd-deleted'; // Working dir Deleted (' D')
                }
            }

            // TODO: Add more specific handling for conflicts (UU, AA, DD, AU, UA, DU, UD)
            // Example: if (stage === ? && workdir === ?) fileStatus = 'conflicted';

            if (fileStatus && filepath !== '.gitignore') { // 忽略 .gitignore 本身
                statusMap[fullPath] = fileStatus;
            }
        });

        lastFolderPath = folderPath;
        lastStatusMap = statusMap;
        lastReadTime = now;
        // console.log("Git status updated:", statusMap);
        return statusMap;
    } catch (error) {
        // console.error('Failed to get git status:', error); // 调试时可以取消注释
        lastFolderPath = folderPath;
        lastStatusMap = {};
        lastReadTime = now;
        return {};
    }
}