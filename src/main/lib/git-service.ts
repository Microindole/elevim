// src/main/lib/git-service.ts
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

// 文件变更详情
export interface GitFileChange {
    path: string;
    status: GitStatus;
    staged: boolean; // 是否在暂存区
}

// 分支信息
export interface GitBranch {
    name: string;
    current: boolean;
    remote?: string;
}

// 提交历史
export interface GitCommit {
    hash: string;
    author: string;
    date: string;
    message: string;
}

// 文件差异
export interface GitDiff {
    additions: number;
    deletions: number;
    changes: string; // unified diff 格式
}

let lastFolderPath: string | null = null;
let lastStatusMap: GitStatusMap = {};
let gitWatcher: chokidar.FSWatcher | null = null;

type StatusChangeCallback = (statusMap: GitStatusMap) => void;
let statusChangeCallbacks: Set<StatusChangeCallback> = new Set();

export function onGitStatusChange(callback: StatusChangeCallback) {
    statusChangeCallbacks.add(callback);
    return () => statusChangeCallbacks.delete(callback);
}

// ========== 原有功能 ==========

export async function startGitWatcher(folderPath: string): Promise<void> {
    if (gitWatcher) {
        await gitWatcher.close();
    }

    lastFolderPath = folderPath;

    const initialStatus = await getGitStatus(folderPath);
    notifyStatusChange(initialStatus);

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

export function notifyStatusChange(statusMap: GitStatusMap) {
    lastStatusMap = statusMap;
    statusChangeCallbacks.forEach(callback => callback(statusMap));
}

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
            timeout: 5000
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

// ========== 新增功能 ==========

// 1. 获取详细的文件变更列表
export async function getGitChanges(folderPath: string): Promise<GitFileChange[]> {
    try {
        const gitDir = path.join(folderPath, '.git');
        await fs.access(gitDir);

        const { stdout } = await execFileAsync('git', ['status', '--porcelain=v1', '-uall'], {
            cwd: folderPath,
            timeout: 5000
        });

        const changes: GitFileChange[] = [];
        const lines = stdout.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
            const statusChars = line.substring(0, 2);
            const filepath = line.substring(3);

            const indexStatus = statusChars[0];
            const workdirStatus = statusChars[1];

            let status: GitStatus = 'unmodified';
            let staged = false;

            // 暂存区状态
            if (indexStatus === 'A') {
                status = 'added';
                staged = true;
            } else if (indexStatus === 'M') {
                status = 'modified';
                staged = true;
            } else if (indexStatus === 'D') {
                status = 'deleted';
                staged = true;
            } else if (indexStatus === 'R') {
                status = 'renamed';
                staged = true;
            }

            // 工作区状态
            if (workdirStatus === 'M') {
                status = 'wd-modified';
                staged = false;
            } else if (workdirStatus === 'D') {
                status = 'wd-deleted';
                staged = false;
            } else if (workdirStatus === '?') {
                status = 'untracked';
                staged = false;
            }

            changes.push({
                path: filepath,
                status,
                staged
            });
        }

        return changes;
    } catch (error: any) {
        console.error('[Git] Failed to get changes:', error.message);
        return [];
    }
}

// 2. 暂存文件
export async function stageFile(folderPath: string, filePath: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['add', filePath], {
            cwd: folderPath,
            timeout: 5000
        });
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to stage file:', error.message);
        return false;
    }
}

// 3. 取消暂存
export async function unstageFile(folderPath: string, filePath: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['reset', 'HEAD', filePath], {
            cwd: folderPath,
            timeout: 5000
        });
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to unstage file:', error.message);
        return false;
    }
}

// 4. 丢弃工作区修改
export async function discardChanges(folderPath: string, filePath: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['checkout', '--', filePath], {
            cwd: folderPath,
            timeout: 5000
        });
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to discard changes:', error.message);
        return false;
    }
}

// 5. 提交
export async function commit(folderPath: string, message: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['commit', '-m', message], {
            cwd: folderPath,
            timeout: 5000
        });
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to commit:', error.message);
        return false;
    }
}

// 6. 获取分支列表
export async function getBranches(folderPath: string): Promise<GitBranch[]> {
    try {
        const { stdout } = await execFileAsync('git', ['branch', '-a', '--format=%(refname:short)|%(HEAD)'], {
            cwd: folderPath,
            timeout: 5000
        });

        const branches: GitBranch[] = [];
        const lines = stdout.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
            const [name, head] = line.split('|');
            const isRemote = name.startsWith('remotes/');
            const branchName = isRemote ? name.replace('remotes/', '') : name;

            branches.push({
                name: branchName,
                current: head === '*',
                remote: isRemote ? branchName : undefined
            });
        }

        return branches;
    } catch (error: any) {
        console.error('[Git] Failed to get branches:', error.message);
        return [];
    }
}

// 7. 切换分支
export async function checkoutBranch(folderPath: string, branchName: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['checkout', branchName], {
            cwd: folderPath,
            timeout: 5000
        });
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to checkout branch:', error.message);
        return false;
    }
}

// 8. 创建分支
export async function createBranch(folderPath: string, branchName: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['checkout', '-b', branchName], {
            cwd: folderPath,
            timeout: 5000
        });
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to create branch:', error.message);
        return false;
    }
}

// 9. 获取提交历史
export async function getCommitHistory(folderPath: string, limit: number = 20): Promise<GitCommit[]> {
    try {
        const { stdout } = await execFileAsync('git', [
            'log',
            `--max-count=${limit}`,
            '--pretty=format:%H|%an|%ad|%s',
            '--date=format:%Y-%m-%d %H:%M'
        ], {
            cwd: folderPath,
            timeout: 5000
        });

        const commits: GitCommit[] = [];
        const lines = stdout.trim().split('\n').filter(line => line.trim());

        for (const line of lines) {
            const [hash, author, date, message] = line.split('|');
            commits.push({ hash, author, date, message });
        }

        return commits;
    } catch (error: any) {
        console.error('[Git] Failed to get commit history:', error.message);
        return [];
    }
}

// 10. 获取文件差异
export async function getFileDiff(folderPath: string, filePath: string, staged: boolean = false): Promise<GitDiff | null> {
    try {
        const args = staged 
            ? ['diff', '--cached', '--', filePath]
            : ['diff', '--', filePath];

        const { stdout } = await execFileAsync('git', args, {
            cwd: folderPath,
            timeout: 5000
        });

        // 计算增加和删除的行数
        let additions = 0;
        let deletions = 0;
        const lines = stdout.split('\n');

        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) additions++;
            if (line.startsWith('-') && !line.startsWith('---')) deletions++;
        }

        return {
            additions,
            deletions,
            changes: stdout
        };
    } catch (error: any) {
        console.error('[Git] Failed to get diff:', error.message);
        return null;
    }
}

// 11. 获取当前分支名
export async function getCurrentBranch(folderPath: string): Promise<string | null> {
    try {
        const { stdout } = await execFileAsync('git', ['branch', '--show-current'], {
            cwd: folderPath,
            timeout: 5000
        });
        return stdout.trim() || null;
    } catch (error: any) {
        console.error('[Git] Failed to get current branch:', error.message);
        return null;
    }
}