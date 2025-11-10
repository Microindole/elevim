// src/main/lib/git/watcher.ts
import * as path from 'path';
import * as chokidar from 'chokidar';
import type { GitStatusMap } from './types';
import { getGitStatus } from './commands'; // 导入分离出去的命令

// ========== 全局状态管理 ==========
let lastFolderPath: string | null = null;
let lastStatusMap: GitStatusMap | null = {};
let gitWatcher: chokidar.FSWatcher | null = null;

type StatusChangeCallback = (statusMap: GitStatusMap | null) => void;
let statusChangeCallbacks: Set<StatusChangeCallback> = new Set();

export function onGitStatusChange(callback: StatusChangeCallback) {
    statusChangeCallbacks.add(callback);
    return () => statusChangeCallbacks.delete(callback);
}

export function notifyStatusChange(statusMap: GitStatusMap | null) {
    lastStatusMap = statusMap;
    statusChangeCallbacks.forEach(callback => callback(statusMap));
}

export async function startGitWatcher(folderPath: string): Promise<void> {
    if (gitWatcher) {
        await gitWatcher.close();
    }

    lastFolderPath = folderPath;

    const initialStatus = await getGitStatus(folderPath);
    notifyStatusChange(initialStatus);

    if (initialStatus === null) {
        console.log('[Git Watcher] No .git directory found. Watcher not started.');
        return;
    }

    gitWatcher = chokidar.watch([
        path.join(folderPath, '.git', 'index'),
        path.join(folderPath, '.git', 'HEAD'),
        path.join(folderPath, '**/*'),
    ], {
        ignored: [
            /(^|[\/\\])\../,
            path.join(folderPath, '.git', 'objects'),
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

    let debounceTimer: NodeJS.Timeout | null = null;
    const refreshStatus = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            // 使用导入的 getGitStatus
            const status = await getGitStatus(folderPath);
            notifyStatusChange(status);
        }, 300);
    };

    gitWatcher
        .on('add', refreshStatus)
        .on('change', refreshStatus)
        .on('unlink', refreshStatus)
        .on('error', (error) => console.error('[Git Watcher] Error:', error));

    console.log('[Git Watcher] Started watching:', folderPath);
}

export async function stopGitWatcher(): Promise<void> {
    if (gitWatcher) {
        await gitWatcher.close();
        gitWatcher = null;
    }
    lastFolderPath = null;
    lastStatusMap = {};
    console.log('[Git Watcher] Stopped');
}