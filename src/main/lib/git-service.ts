// src/main/lib/git-service.ts
import * as fs from 'node:fs/promises'; // 修改: 使用 promises 版本的 fs
import * as path from 'path';
// import git from 'isomorphic-git'; // 不再需要 statusMatrix
// import http from 'isomorphic-git/http/node'; // 不再需要 http
import { execFile } from 'child_process'; // <<< 引入 execFile
import { promisify } from 'util'; // <<< 引入 promisify 将回调转为 Promise

const execFileAsync = promisify(execFile); // <<< 创建 execFile 的 Promise 版本

// --- GitStatus 和 GitStatusMap 类型定义保持不变 ---
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

// --- 缓存逻辑保持不变 ---
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
        // --- 检查 .git 目录逻辑保持不变 ---
        const gitDir = path.join(folderPath, '.git');
        try {
            await fs.access(gitDir);
        } catch {
            lastFolderPath = folderPath;
            lastStatusMap = {};
            lastReadTime = now;
            return {};
        }

        // --- 使用原生 git 命令获取状态 ---
        console.log(`[DEBUG] Executing git status for: ${folderPath}`);
        // - `git status --porcelain=v1`: 提供易于机器解析的输出格式
        // - `-uall`: 显示所有未跟踪的文件（包括目录内的）
        const { stdout, stderr } = await execFileAsync('git', ['status', '--porcelain=v1', '-uall'], { cwd: folderPath });

        if (stderr) {
            console.error(`[Main] git status stderr: ${stderr}`);
            // 可以选择在这里返回空状态或抛出错误
        }

        const statusMap: GitStatusMap = {};
        const lines = stdout.trim().split('\n');

        lines.forEach(line => {
            if (!line.trim()) return; // 跳过空行

            console.log(`[DEBUG] Processing line: "${line}"`);

            const statusChars = line.substring(0, 2); // 获取前两个状态字符
            const filepath = line.substring(3); // 获取文件名（相对路径）
            const fullPath = path.join(folderPath, filepath);
            let fileStatus: GitStatus | null = null;

            const indexStatus = statusChars[0]; // 暂存区状态
            const workdirStatus = statusChars[1]; // 工作区状态

            // 解析状态 (参考 git status --porcelain 文档)
            if (indexStatus === 'A') fileStatus = 'added'; // A  或 AM
            else if (indexStatus === 'M') fileStatus = 'modified'; // M  或 MM
            else if (indexStatus === 'D') fileStatus = 'deleted'; // D
            else if (indexStatus === 'R') fileStatus = 'renamed'; // R (暂未细分)
            else if (indexStatus === 'C') fileStatus = 'typechange'; // C (暂未细分，copy 算不算 typechange?)
            else if (indexStatus === 'U') fileStatus = 'conflicted'; // UU, AU, UA, DU, UD, AA, DD
            // 如果暂存区没有标记，检查工作区
            else if (indexStatus === ' ' || indexStatus === '?') {
                if (workdirStatus === 'M') fileStatus = 'wd-modified'; // ' M'
                else if (workdirStatus === 'D') fileStatus = 'wd-deleted'; // ' D'
                else if (workdirStatus === 'A') fileStatus = 'added'; // ' A' (isomorphic-git 好像没这种情况，但原生 git add 后 reset 可能有)
                else if (workdirStatus === 'R') fileStatus = 'wd-renamed'; // ' R' (暂未细分)
                else if (workdirStatus === 'C') fileStatus = 'wd-typechange';// ' C' (暂未细分)
                else if (workdirStatus === 'U') fileStatus = 'conflicted'; // 同上
            }
            // 特殊处理未跟踪文件
            if (statusChars === '??') {
                fileStatus = 'untracked';
            }

            if (filepath.includes('package.json')) {
                console.log(`[DEBUG] Found package.json: line="${line}", statusChars="${statusChars}", parsedFilepath="${filepath}", determinedStatus="${fileStatus}"`);
            }

            // 添加到 Map 中
            if (fileStatus) { // 忽略 .gitignore 本身
                // 注意：如果文件路径包含空格且没有被引号包围（porcelain v1 默认不包围），需要处理
                // 但通常 execFile 的输出已经处理好了
                statusMap[fullPath] = fileStatus;

                // <<< 确认 package.json 是否被添加 >>>
                if (filepath.includes('package.json')) {
                    console.log(`[DEBUG] Added package.json to statusMap with status: ${fileStatus}`);
                }
            }else if (filepath.includes('package.json')) { // <<< 如果没添加，看看原因 >>>
                console.log(`[DEBUG] Skipped adding package.json, fileStatus was null.`);
            }
        });
        console.log("[DEBUG] Final parsed statusMap:", statusMap);

        // console.log("[DEBUG] Parsed statusMap:", statusMap);

        lastFolderPath = folderPath;
        lastStatusMap = statusMap;
        lastReadTime = now;
        return statusMap;

    } catch (error: any) {
        console.error('[Main] Failed to get git status via command:', error.message); // 打印错误信息
        // 检查是否是 "git command not found" 之类的错误
        if (error.code === 'ENOENT') {
            console.error('[Main] Git command not found. Make sure Git is installed and in PATH.');
            // 可以在这里通知渲染进程 Git 不可用
        }
        lastFolderPath = folderPath; // 即使出错也更新路径，避免连续尝试
        lastStatusMap = {}; // 返回空状态
        lastReadTime = now;
        return {};
    }
}