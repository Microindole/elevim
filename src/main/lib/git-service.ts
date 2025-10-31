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

export interface GitFileChange {
    path: string;
    status: GitStatus;
    staged: boolean;
}

export interface GitBranch {
    name: string;
    current: boolean;
    remote?: string;
}

export interface GitCommit {
    hash: string;
    author: string;
    date: string;
    message: string;
}

export interface GitDiff {
    additions: number;
    deletions: number;
    changes: string;
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

// 解析 git status 输出的文件路径
function parseFilePath(line: string): string {
    // git status --porcelain 格式: XY filename
    // 其中 XY 是两个字符的状态码,后面跟一个空格,然后是文件路径
    let startIndex = 2;
    // 跳过状态码后的所有空格
    while (startIndex < line.length && line[startIndex] === ' ') {
        startIndex++;
    }
    return line.substring(startIndex);
}

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
            const filepath = parseFilePath(line);

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

// 获取详细的文件变更列表
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
            const filepath = parseFilePath(line);

            if (!filepath) {
                console.warn('[Git] Empty filepath in line:', line);
                continue;
            }

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

            console.log(`[Git] Parsed change: ${filepath} -> ${status} (staged: ${staged})`);

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

// 暂存文件
export async function stageFile(folderPath: string, filePath: string): Promise<boolean> {
    try {
        console.log(`[Git] Staging file: ${filePath}`);
        await execFileAsync('git', ['add', '--', filePath], {
            cwd: folderPath,
            timeout: 5000
        });
        console.log(`[Git] Successfully staged: ${filePath}`);
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to stage file:', filePath, error.message);
        return false;
    }
}

// 取消暂存
export async function unstageFile(folderPath: string, filePath: string): Promise<boolean> {
    try {
        console.log(`[Git] Unstaging file: ${filePath}`);
        await execFileAsync('git', ['reset', 'HEAD', '--', filePath], {
            cwd: folderPath,
            timeout: 5000
        });
        console.log(`[Git] Successfully unstaged: ${filePath}`);
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to unstage file:', filePath, error.message);
        return false;
    }
}

// 丢弃工作区修改
export async function discardChanges(folderPath: string, filePath: string): Promise<boolean> {
    try {
        console.log(`[Git] Discarding changes for: ${filePath}`);

        // 先检查文件是否被 Git 跟踪
        try {
            await execFileAsync('git', ['ls-files', '--error-unmatch', '--', filePath], {
                cwd: folderPath,
                timeout: 5000
            });
        } catch (lsError) {
            console.error('[Git] File not tracked by Git:', filePath);
            return false;
        }

        // 使用 restore 命令(Git 2.23+)或 checkout 作为后备
        try {
            await execFileAsync('git', ['restore', '--', filePath], {
                cwd: folderPath,
                timeout: 5000
            });
        } catch (restoreError) {
            // 如果 restore 失败,尝试使用 checkout
            await execFileAsync('git', ['checkout', '--', filePath], {
                cwd: folderPath,
                timeout: 5000
            });
        }

        console.log(`[Git] Successfully discarded changes: ${filePath}`);
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to discard changes:', filePath, error.message);
        return false;
    }
}

// 提交
export async function commit(folderPath: string, message: string): Promise<boolean> {
    try {
        const trimmedMessage = message.trim();
        if (trimmedMessage.length < 3) {
            console.error('[Git] Commit message too short (minimum 3 characters)');
            return false;
        }

        const { stdout } = await execFileAsync('git', ['diff', '--cached', '--name-only'], {
            cwd: folderPath,
            timeout: 5000
        });

        if (!stdout.trim()) {
            console.error('[Git] No staged changes to commit');
            return false;
        }

        await execFileAsync('git', ['commit', '-m', trimmedMessage], {
            cwd: folderPath,
            timeout: 10000
        });

        const newStatus = await getGitStatus(folderPath);
        notifyStatusChange(newStatus);

        console.log('[Git] Commit successful');
        return true;
    } catch (error: any) {
        if (error.message.includes('user.name') || error.message.includes('user.email')) {
            console.error('[Git] Git user not configured. Run: git config --global user.name "Your Name" && git config --global user.email "your@email.com"');
        }
        console.error('[Git] Failed to commit:', error.message);
        return false;
    }
}

// 获取分支列表
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

// 切换分支
export async function checkoutBranch(folderPath: string, branchName: string): Promise<boolean> {
    try {
        const status = await getGitStatus(folderPath);
        const hasUncommitted = Object.keys(status).some(file => {
            const s = status[file];
            return s !== 'untracked';
        });

        if (hasUncommitted) {
            console.error('[Git] Cannot checkout: uncommitted changes exist');
            return false;
        }

        await execFileAsync('git', ['checkout', branchName], {
            cwd: folderPath,
            timeout: 5000
        });

        const newStatus = await getGitStatus(folderPath);
        notifyStatusChange(newStatus);

        console.log(`[Git] Successfully checked out branch: ${branchName}`);
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to checkout branch:', error.message);
        return false;
    }
}

// 创建分支
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

// 获取提交历史
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

// 获取文件差异
export async function getFileDiff(folderPath: string, filePath: string, staged: boolean = false): Promise<GitDiff | null> {
    try {
        console.log(`[Git] Getting diff for: ${filePath}, staged: ${staged}`);

        let args: string[];
        if (staged) {
            // 对于已暂存的文件,比较暂存区和 HEAD
            args = ['diff', '--cached', '--', filePath];
        } else {
            // 对于未暂存的文件,比较工作区和暂存区(或 HEAD)
            args = ['diff', '--', filePath];
        }

        const { stdout } = await execFileAsync('git', args, {
            cwd: folderPath,
            timeout: 5000
        });

        // 如果没有输出,可能是新文件
        if (!stdout.trim()) {
            console.log(`[Git] No diff output, checking if file is untracked/new`);

            // 对于 untracked 文件,显示整个文件内容
            if (!staged) {
                try {
                    const fullPath = path.join(folderPath, filePath);
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const lines = content.split('\n');

                    // 构造类似 diff 的输出
                    const fakeDiff = [
                        `diff --git a/${filePath} b/${filePath}`,
                        `new file mode 100644`,
                        `--- /dev/null`,
                        `+++ b/${filePath}`,
                        `@@ -0,0 +1,${lines.length} @@`,
                        ...lines.map(line => `+${line}`)
                    ].join('\n');

                    return {
                        additions: lines.length,
                        deletions: 0,
                        changes: fakeDiff
                    };
                } catch (readError) {
                    console.error('[Git] Failed to read file:', readError);
                }
            }
        }

        let additions = 0;
        let deletions = 0;
        const lines = stdout.split('\n');

        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) additions++;
            if (line.startsWith('-') && !line.startsWith('---')) deletions++;
        }

        console.log(`[Git] Diff stats: +${additions} -${deletions}`);

        return {
            additions,
            deletions,
            changes: stdout
        };
    } catch (error: any) {
        console.error('[Git] Failed to get diff:', filePath, error.message);
        return null;
    }
}

// 获取当前分支名
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

// 暂存工作区更改
export async function stashChanges(folderPath: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['stash', 'push', '-m', 'Auto-stash before branch switch'], {
            cwd: folderPath,
            timeout: 5000
        });
        console.log('[Git] Changes stashed successfully');
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to stash:', error.message);
        return false;
    }
}

// 恢复暂存的更改
export async function popStash(folderPath: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['stash', 'pop'], {
            cwd: folderPath,
            timeout: 5000
        });
        console.log('[Git] Stash applied successfully');
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to pop stash:', error.message);
        return false;
    }
}