// src/main/lib/git/commands.ts
import * as fs from 'node:fs/promises';
import * as path from 'path';
import {execFile} from 'child_process';
import {promisify} from 'util';

// 从您的类型文件中导入
import type {
    GitStatus,
    GitStatusMap,
    GitFileChange,
    GitBranch,
    GitCommit,
    GitDiff
} from './types';

const execFileAsync = promisify(execFile);

// ========== 内部工具函数 (不导出) ==========
function parseFilePath(line: string): string {
    let startIndex = 2;
    while (startIndex < line.length && line[startIndex] === ' ') {
        startIndex++;
    }
    return line.substring(startIndex);
}

// ========== 导出的 Git 命令函数 ==========

export async function getGitStatus(folderPath: string): Promise<GitStatusMap | null> {
    try {
        const gitDir = path.join(folderPath, '.git');
        try {
            await fs.access(gitDir);
        } catch {
            return null;
        }

        const {stdout} = await execFileAsync('git', ['status', '--porcelain=v1', '-uall'], {
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
        return null;
    }
}

export async function getGitChanges(folderPath: string): Promise<GitFileChange[]> {
    try {
        const gitDir = path.join(folderPath, '.git');
        await fs.access(gitDir);

        const {stdout} = await execFileAsync('git', ['status', '--porcelain=v1', '-uall'], {
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

export async function discardChanges(folderPath: string, filePath: string): Promise<boolean> {
    try {
        console.log(`[Git] Discarding changes for: ${filePath}`);

        try {
            await execFileAsync('git', ['ls-files', '--error-unmatch', '--', filePath], {
                cwd: folderPath,
                timeout: 5000
            });
        } catch (lsError) {
            console.error('[Git] File not tracked by Git:', filePath);
            return false;
        }

        try {
            await execFileAsync('git', ['restore', '--', filePath], {
                cwd: folderPath,
                timeout: 5000
            });
        } catch (restoreError) {
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

export async function commit(folderPath: string, message: string): Promise<boolean> {
    try {
        const trimmedMessage = message.trim();
        if (trimmedMessage.length < 3) {
            console.error('[Git] Commit message too short (minimum 3 characters)');
            return false;
        }

        const {stdout} = await execFileAsync('git', ['diff', '--cached', '--name-only'], {
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

        // 注意：刷新状态的逻辑在 ipc-handlers.ts 中，这里不需要
        console.log('[Git] Commit successful');
        return true;
    } catch (error: any) {
        if (error.message.includes('user.name') || error.message.includes('user.email')) {
            console.error('[Git] Git user not configured');
        }
        console.error('[Git] Failed to commit:', error.message);
        return false;
    }
}

export async function getBranches(folderPath: string): Promise<GitBranch[]> {
    try {
        const {stdout} = await execFileAsync('git', ['branch', '-a', '--format=%(refname:short)|%(HEAD)'], {
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

        // 注意：刷新状态的逻辑在 ipc-handlers.ts 中，这里不需要
        console.log(`[Git] Successfully checked out branch: ${branchName}`);
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to checkout branch:', error.message);
        return false;
    }
}

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

export async function getCommitHistory(folderPath: string, limit: number = 50, skip: number = 0): Promise<GitCommit[]> {
    try {
        // 优化：移除 --stat，只获取基础信息，极大提升速度
        const {stdout: logOutput} = await execFileAsync('git', [
            'log',
            `--max-count=${limit}`,
            `--skip=${skip}`, // 支持分页
            '--all',
            '--format=%H%x1f%P%x1f%an%x1f%ad%x1f%s%x1f%D',
            '--date=format:%Y-%m-%d %H:%M'
        ], {
            cwd: folderPath,
            timeout: 10000
        });

        if (!logOutput.trim()) {
            return [];
        }

        const commits: GitCommit[] = [];
        const lines = logOutput.trim().split('\n');

        for (const line of lines) {
            const parts = line.trim().split('\x1f');
            if (parts.length < 5) continue;

            const [hash, parents, author, date, message, refs] = parts;

            // 解析分支信息
            let branch = 'HEAD';
            if (refs) {
                const refsList = refs.split(',').map(r => r.trim());
                const localBranch = refsList.find(r => !r.includes('HEAD') && !r.includes('origin/') && !r.includes('tag:'));
                if (localBranch) {
                    branch = localBranch;
                } else {
                    const remoteBranch = refsList.find(r => r.includes('origin/'));
                    if (remoteBranch) {
                        branch = remoteBranch.replace('origin/', '');
                    }
                }
            }

            commits.push({
                hash,
                parentHashes: parents ? parents.split(' ').filter(Boolean) : [],
                message,
                author,
                date,
                branch,
                graph: [],
                // fileChanges: undefined // 列表加载时不再返回文件详情
            });
        }

        return commits;
    } catch (error: any) {
        console.error('[Git] Failed to get commit history:', error.message);
        return [];
    }
}

// 获取单个提交的详细信息（包含文件统计）
export async function getCommitDetails(folderPath: string, commitHash: string) {
    try {
        const {stdout: statOutput} = await execFileAsync('git', [
            'show',
            '--stat',
            '--format=',
            commitHash
        ], {
            cwd: folderPath,
            timeout: 3000
        });

        if (statOutput.trim()) {
            const statLines = statOutput.trim().split('\n');
            const files: string[] = [];
            let additions = 0;
            let deletions = 0;

            for (const statLine of statLines) {
                const match = statLine.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([+-]*)/);
                if (match) {
                    const fileName = match[1].trim();
                    files.push(fileName);

                    const changes = match[3];
                    const plusCount = (changes.match(/\+/g) || []).length;
                    const minusCount = (changes.match(/-/g) || []).length;
                    additions += plusCount;
                    deletions += minusCount;
                }
            }

            if (files.length > 0) {
                return { additions, deletions, files };
            }
        }
        return null;
    } catch (error) {
        console.warn('[Git] Failed to get details for commit', commitHash);
        return null;
    }
}

export async function getFileDiff(folderPath: string, filePath: string, staged: boolean = false): Promise<GitDiff | null> {
    try {
        console.log(`[Git] Getting diff for: ${filePath}, staged: ${staged}`);

        let args: string[];
        if (staged) {
            args = ['diff', '--cached', '--', filePath];
        } else {
            args = ['diff', '--', filePath];
        }

        const {stdout} = await execFileAsync('git', args, {
            cwd: folderPath,
            timeout: 5000
        });

        if (!stdout.trim()) {
            console.log(`[Git] No diff output, checking if file is untracked/new`);

            if (!staged) {
                try {
                    const fullPath = path.join(folderPath, filePath);
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const lines = content.split('\n');

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

export async function getCurrentBranch(folderPath: string): Promise<string | null> {
    try {
        const {stdout} = await execFileAsync('git', ['branch', '--show-current'], {
            cwd: folderPath,
            timeout: 5000
        });
        return stdout.trim() || null;
    } catch (error: any) {
        console.error('[Git] Failed to get current branch:', error.message);
        return null;
    }
}

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

export async function checkoutCommit(folderPath: string, commitHash: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['checkout', '--detach', commitHash], { cwd: folderPath });
        return true;
    } catch (err) {
        console.error('[Git] checkoutCommit failed', err);
        return false;
    }
}

export async function createBranchFromCommit(folderPath: string, commitHash: string, branchName?: string): Promise<string | null> {
    try {
        const safeName = branchName || `branch-from-${commitHash.substring(0,7)}`;
        await execFileAsync('git', ['branch', safeName, commitHash], { cwd: folderPath });
        return safeName;
    } catch (err) {
        console.error('[Git] createBranchFromCommit failed', err);
        return null;
    }
}

export async function getCommitDiff(folderPath: string, commitHash: string): Promise<string | null> {
    try {
        const { stdout } = await execFileAsync('git', ['show', commitHash, '--pretty=fuller', '--stat'], {
            cwd: folderPath,
            maxBuffer: 10 * 1024 * 1024
        });
        return stdout;
    } catch (err) {
        console.error('[Git] getCommitDiff failed', err);
        return null;
    }
}

export async function initRepo(folderPath: string): Promise<boolean> {
    try {
        console.log(`[Git] Initializing repository in: ${folderPath}`);
        await execFileAsync('git', ['init'], {
            cwd: folderPath,
            timeout: 5000
        });
        console.log(`[Git] Repository initialized successfully.`);
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to init repo:', error.message);
        return false;
    }
}

export async function getRemotes(folderPath: string): Promise<string[]> {
    try {
        const { stdout } = await execFileAsync('git', ['remote', '-v'], {
            cwd: folderPath,
            timeout: 5000
        });
        return stdout.trim().split('\n').filter(Boolean);
    } catch (error: any) {
        // "git remote -v" 在没有 remote 时会返回空, 但如果出错则返回空数组
        console.warn('[Git] Failed to get remotes:', error.message);
        return [];
    }
}

export async function addRemote(folderPath: string, remoteName: string, remoteUrl: string): Promise<boolean> {
    try {
        await execFileAsync('git', ['remote', 'add', remoteName, remoteUrl], {
            cwd: folderPath,
            timeout: 5000
        });
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to add remote:', error.message);
        return false;
    }
}

export async function pushToRemote(folderPath: string, remoteName: string, branchName: string): Promise<boolean> {
    try {
        // 使用 -u 设置上游
        await execFileAsync('git', ['push', '-u', remoteName, branchName], {
            cwd: folderPath,
            timeout: 30000 // 推送可能需要更长时间
        });
        return true;
    } catch (error: any) {
        console.error('[Git] Failed to push to remote:', error.message);
        return false;
    }
}