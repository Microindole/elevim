import { IpcMain } from 'electron';
import { IpcHandlerSharedState } from './state';
import * as auth from '../lib/github-auth';
import * as git from '../lib/git-service';
import {GITHUB_EVENTS, githubChannels} from "../../shared/constants";

export const registerGitHubHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {
    // 检查是否已有 Token
    ipcMain.handle(githubChannels.GET_TOKEN_STATUS, async () => {
        const token = await auth.getGitHubToken();
        return !!token;
    });

    // 启动 OAuth 流程
    ipcMain.handle(githubChannels.START_AUTH, async () => {
        try {
            const token = await auth.startGitHubAuth(state.getMainWindow());
            return !!token;
        } catch (e: any) {
            console.error('[IPC-Auth] Auth flow failed:', e.message);
            return false;
        }
    });

    // "发布到 GitHub" 的核心逻辑
    ipcMain.handle(githubChannels.PUBLISH_REPO, async (_event, { repoName, isPrivate }: { repoName: string, isPrivate: boolean }) => {
        const folderPath = state.getFolder();
        if (!folderPath) {
            return { success: false, error: 'No folder open' };
        }

        try {
            console.log('[Publish] Starting publish process...', { repoName, isPrivate });

            // 1. 获取 Token (如果不存在，启动 Device Flow 认证)
            let token = await auth.getGitHubToken();
            if (!token) {
                console.log('[Publish] No token found, starting Device Flow auth...');
                token = await auth.startGitHubAuth(state.getMainWindow());
            }

            // 2. 检查本地是否是 Git 仓库
            const status = await git.getGitStatus(folderPath);
            if (status === null) {
                console.log('[Publish] No Git repo detected, initializing...');
                await git.initRepo(folderPath);

                // 创建 README.md（如果不存在）
                const readmePath = path.join(folderPath, 'README.md');
                try {
                    await fs.promises.access(readmePath);
                } catch {
                    await fs.promises.writeFile(
                        readmePath,
                        `# ${repoName}\n\nCreated with Elevim Editor\n`
                    );
                }

                // 暂存所有文件
                await git.stageFile(folderPath, '.');
                await git.commit(folderPath, 'Initial commit');
            } else {
                // 3. 检查是否有提交记录
                console.log('[Publish] Checking for existing commits...');
                const { execFile } = require('child_process');
                const { promisify } = require('util');
                const execFileAsync = promisify(execFile);

                try {
                    await execFileAsync('git', ['rev-parse', 'HEAD'], {
                        cwd: folderPath,
                        timeout: 5000
                    });
                    console.log('[Publish] Repository has commits');
                } catch {
                    console.log('[Publish] No commits found, creating initial commit...');

                    // 检查是否有未暂存的更改
                    const changes = await git.getGitChanges(folderPath);
                    if (changes.length === 0) {
                        // 没有任何文件，创建 README
                        const readmePath = path.join(folderPath, 'README.md');
                        await fs.promises.writeFile(
                            readmePath,
                            `# ${repoName}\n\nCreated with Elevim Editor\n`
                        );
                    }

                    // 暂存所有文件
                    await git.stageFile(folderPath, '.');

                    // 创建初始提交
                    const committed = await git.commit(folderPath, 'Initial commit');
                    if (!committed) {
                        throw new Error('Failed to create initial commit');
                    }
                }
            }

            // 4. 获取当前分支名（优先使用 main）
            let currentBranch = await git.getCurrentBranch(folderPath);

            if (!currentBranch) {
                console.log('[Publish] No branch name, setting to main...');
                const { execFile } = require('child_process');
                const { promisify } = require('util');
                const execFileAsync = promisify(execFile);

                try {
                    // 尝试重命名为 main
                    await execFileAsync('git', ['branch', '-M', 'main'], {
                        cwd: folderPath,
                        timeout: 5000
                    });
                    currentBranch = 'main';
                } catch {
                    // 如果失败，使用 master
                    currentBranch = 'master';
                }
            }

            console.log('[Publish] Using branch:', currentBranch);

            // 5. 在 GitHub 上创建仓库
            console.log(`[Publish] Creating GitHub repo: ${repoName}`);
            const cloneUrl = await auth.createGitHubRepo(token, repoName, isPrivate);
            console.log('[Publish] Repo created:', cloneUrl);

            // 6. 检查并添加远程仓库
            const remotes = await git.getRemotes(folderPath);
            const hasOrigin = remotes.some(r => r.includes('origin'));

            if (hasOrigin) {
                console.log('[Publish] Remote origin exists, removing...');
                const { execFile } = require('child_process');
                const { promisify } = require('util');
                const execFileAsync = promisify(execFile);

                try {
                    await execFileAsync('git', ['remote', 'remove', 'origin'], {
                        cwd: folderPath,
                        timeout: 5000
                    });
                } catch (e) {
                    console.warn('[Publish] Failed to remove origin:', e);
                }
            }

            console.log(`[Publish] Adding remote origin: ${cloneUrl}`);
            const remoteAdded = await git.addRemote(folderPath, 'origin', cloneUrl);
            if (!remoteAdded) {
                throw new Error('Failed to add remote origin');
            }

            // 7. 推送到 GitHub
            console.log(`[Publish] Pushing to origin ${currentBranch}...`);
            const pushed = await git.pushToRemote(folderPath, 'origin', currentBranch);
            if (!pushed) {
                throw new Error('Failed to push to remote');
            }

            console.log('[Publish] Publish successful!');

            // 8. 通知渲染进程成功
            state.getMainWindow().webContents.send(GITHUB_EVENTS.PUBLISH_SUCCESS);

            return {
                success: true,
                error: null,
                repoUrl: cloneUrl.replace('.git', '')
            };

        } catch (e: any) {
            console.error('[IPC-Publish] Publish failed:', e.message);

            // 提供更友好的错误消息
            let errorMessage = e.message;

            if (e.message.includes('name already exists')) {
                errorMessage = `仓库 "${repoName}" 已存在于你的 GitHub 账户中`;
            } else if (e.message.includes('Authentication failed')) {
                errorMessage = 'GitHub 认证失败，请重新授权';
            } else if (e.message.includes('network timeout')) {
                errorMessage = '网络超时，请检查网络连接';
            } else if (e.message.includes('src refspec')) {
                errorMessage = '推送失败：本地分支不存在或没有提交';
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    });
};