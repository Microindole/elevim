// src/main/lib/git-service.ts
import * as fs from 'node:fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type GitStatus =
    | 'unmodified'
    | 'added'
    | 'modified'
    | 'deleted'
    | 'renamed'
    | 'typechange'
    | 'untracked'
    | 'wd-modified'
    | 'wd-deleted'
    | 'wd-renamed'
    | 'wd-typechange'
    | 'conflicted';
export type GitStatusMap = Record<string, GitStatus>;

let lastFolderPath: string | null = null;
let lastStatusMap: GitStatusMap = {};
let lastReadTime = 0;
const CACHE_DURATION = 1500;

export async function getGitStatus(folderPath: string): Promise<GitStatusMap> {
    const now = Date.now();
    if (folderPath === lastFolderPath && now - lastReadTime < CACHE_DURATION) {
        return lastStatusMap;
    }

    try {
        const gitDir = path.join(folderPath, '.git');
        try {
            await fs.access(gitDir);
        } catch {
            lastFolderPath = folderPath;
            lastStatusMap = {};
            lastReadTime = now;
            return {};
        }

        console.log(`[DEBUG] Executing git status for: ${folderPath}`);
        const { stdout, stderr } = await execFileAsync('git', ['status', '--porcelain=v1', '-uall'], { cwd: folderPath });

        if (stderr) {
            console.error(`[Main] git status stderr: ${stderr}`);
        }

        const statusMap: GitStatusMap = {};
        const lines = stdout.trim().split('\n');

        lines.forEach(line => {
            if (!line.trim()) return;

            // 详细调试：显示每个字符的索引
            console.log(`[DEBUG] Processing line: "${line}"`);
            console.log(`[DEBUG] Line chars:`, Array.from(line).map((c, i) => `[${i}]='${c}'`).join(' '));

            const statusChars = line.substring(0, 2);

            // ✅ 健壮的解析方式：找到第一个非空格字符的位置
            let filepathStartIndex = 2; // 默认从索引 2 开始
            while (filepathStartIndex < line.length && line[filepathStartIndex] === ' ') {
                filepathStartIndex++;
            }

            const filepath = line.substring(filepathStartIndex);

            console.log(`[DEBUG] Parsed: statusChars="${statusChars}", filepath="${filepath}"`);

            let fileStatus: GitStatus | null = null;
            const indexStatus = statusChars[0];
            const workdirStatus = statusChars[1];

            // 解析状态
            if (indexStatus === 'A') fileStatus = 'added';
            else if (indexStatus === 'M') fileStatus = 'modified';
            else if (indexStatus === 'D') fileStatus = 'deleted';
            else if (indexStatus === 'R') fileStatus = 'renamed';
            else if (indexStatus === 'C') fileStatus = 'typechange';
            else if (indexStatus === 'U') fileStatus = 'conflicted';
            else if (indexStatus === ' ' || indexStatus === '?') {
                if (workdirStatus === 'M') fileStatus = 'wd-modified';
                else if (workdirStatus === 'D') fileStatus = 'wd-deleted';
                else if (workdirStatus === 'A') fileStatus = 'added';
                else if (workdirStatus === 'R') fileStatus = 'wd-renamed';
                else if (workdirStatus === 'C') fileStatus = 'wd-typechange';
                else if (workdirStatus === 'U') fileStatus = 'conflicted';
            }

            if (statusChars === '??') {
                fileStatus = 'untracked';
            }

            if (fileStatus && filepath) {
                const fullPath = path.join(folderPath, filepath);
                statusMap[fullPath] = fileStatus;
                console.log(`[DEBUG] Added: ${fullPath} -> ${fileStatus}`);
            }
        });

        console.log("[DEBUG] Final parsed statusMap:", statusMap);

        lastFolderPath = folderPath;
        lastStatusMap = statusMap;
        lastReadTime = now;
        return statusMap;

    } catch (error: any) {
        console.error('[Main] Failed to get git status via command:', error.message);
        if (error.code === 'ENOENT') {
            console.error('[Main] Git command not found. Make sure Git is installed and in PATH.');
        }
        lastFolderPath = folderPath;
        lastStatusMap = {};
        lastReadTime = now;
        return {};
    }
}