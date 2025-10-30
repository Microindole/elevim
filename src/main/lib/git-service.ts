import * as fs from 'node:fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as chokidar from 'chokidar';

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

// 缓存机制
let lastFolderPath: string | null = null;
let lastStatusMap: GitStatusMap = {};
let gitWatcher: chokidar.FSWatcher | null = null;

// ✅ 新增：状态变化回调
type StatusChangeCallback = (statusMap: GitStatusMap) => void;
let statusChangeCallbacks: Set<StatusChangeCallback> = new Set();

export function onGitStatusChange(callback: StatusChangeCallback) {
    statusChangeCallbacks.add(callback);
    return () => statusChangeCallbacks.delete(callback);
}

// ✅ 启动文件监听器
export async function startGitWatcher(folderPath: string): Promise<void> {
    // 停止旧的监听器
    if (gitWatcher) {
        await gitWatcher.close();
    }

    lastFolderPath = folderPath;

    // 初始化获取一次状态
    const initialStatus = await getGitStatus(folderPath);
    notifyStatusChange(initialStatus);

    // 监听 .git 目录和工作区文件
    gitWatcher = chokidar.watch([
        path.join(folderPath, '.git', 'index'),  // Git 暂存区
        path.join(folderPath, '.git', 'HEAD'),   // 当前分支
        path.join(folderPath, '**/*'),           // 所有文件
    ], {
        ignored: [
            /(^|[\/\\])\../,                     // 忽略 . 开头的文件
            path.join(folderPath, '.git', 'objects'), // 忽略 git objects
            path.join(folderPath, '.git', 'logs'),
            '**/node_modules/**',
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50
        }
    });

    // 防抖：避免短时间内多次刷新
    let debounceTimer: NodeJS.Timeout | null = null;
    const refreshStatus = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const status = await getGitStatus(folderPath);
            notifyStatusChange(status);
        }, 300); // 300ms 防抖
    };

    gitWatcher
        .on('add', refreshStatus)
        .on('change', refreshStatus)
        .on('unlink', refreshStatus)
        .on('error', (error) => console.error('[Git Watcher] Error:', error));

    console.log('[Git Watcher] Started watching:', folderPath);
}

// ✅ 停止文件监听器
export async function stopGitWatcher(): Promise<void> {
    if (gitWatcher) {
        await gitWatcher.close();
        gitWatcher = null;
    }
    lastFolderPath = null;
    lastStatusMap = {};
    console.log('[Git Watcher] Stopped');
}

function notifyStatusChange(statusMap: GitStatusMap) {
    lastStatusMap = statusMap;
    statusChangeCallbacks.forEach(callback => callback(statusMap));
}

// 获取 Git 状态（核心逻辑不变）
export async function getGitStatus(folderPath: string): Promise<GitStatusMap> {
    try {
        const gitDir = path.join(folderPath, '.git');
        try {
            await fs.access(gitDir);
        } catch {
            return {};
        }

        const { stdout } = await execFileAsync('git', ['status', '--porcelain=v1', '-uall'], {
            cwd: folderPath,
            timeout: 5000 // 5秒超时
        });

        const statusMap: GitStatusMap = {};
        const lines = stdout.trim().split('\n');

        lines.forEach(line => {
            if (!line.trim()) return;

            const statusChars = line.substring(0, 2);
            let filepathStartIndex = 2;
            while (filepathStartIndex < line.length && line[filepathStartIndex] === ' ') {
                filepathStartIndex++;
            }
            const filepath = line.substring(filepathStartIndex);

            let fileStatus: GitStatus | null = null;
            const indexStatus = statusChars[0];
            const workdirStatus = statusChars[1];

            if (indexStatus === 'A') fileStatus = 'added';
            else if (indexStatus === 'M') fileStatus = 'modified';
            else if (indexStatus === 'D') fileStatus = 'deleted';
            else if (indexStatus === 'R') fileStatus = 'renamed';
            else if (indexStatus === 'U') fileStatus = 'conflicted';
            else if (indexStatus === ' ' || indexStatus === '?') {
                if (workdirStatus === 'M') fileStatus = 'wd-modified';
                else if (workdirStatus === 'D') fileStatus = 'wd-deleted';
                else if (workdirStatus === 'A') fileStatus = 'added';
            }

            if (statusChars === '??') fileStatus = 'untracked';

            if (fileStatus && filepath) {
                const fullPath = path.join(folderPath, filepath);
                statusMap[fullPath] = fileStatus;
            }
        });

        return statusMap;
    } catch (error: any) {
        console.error('[Git] Failed to get status:', error.message);
        return {};
    }
}