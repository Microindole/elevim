// src/main/ipc-handlers/github.handlers.ts
import { IpcMain, dialog, BrowserWindow } from 'electron'; // 导入 dialog
import * as path from 'path'; // 导入 path
import * as fs from 'fs'; // 导入 fs
import { IpcHandlerSharedState } from './state';
import * as auth from '../lib/github-auth';
import * as git from '../lib/git-service';
import { GITHUB_EVENTS, githubChannels } from "../../shared/constants";

// --- 内部辅助函数：安全地检查和设置远程仓库 ---
/**
 * 检查本地仓库是否已有 'origin' 远程仓库。
 * 如果有，则弹窗询问用户是否覆盖。
 * 如果用户同意，则移除旧的并添加新的。
 * @param window - 用于显示对话框的父窗口
 * @param folderPath - 本地仓库路径
 * @param newRepoUrl - 新的 GitHub 仓库 URL
 * @returns {Promise<boolean>} - 用户是否同意并成功设置了远程仓库
 */
async function checkAndSetRemote(window: BrowserWindow, folderPath: string, newRepoUrl: string): Promise<boolean> {
    const remotes = await git.getRemotes(folderPath);
    const hasOrigin = remotes.some(r => r.includes('origin'));

    if (hasOrigin) {
        console.warn('[IPC-GitHub] Remote origin already exists.');
        const { response } = await dialog.showMessageBox(window, {
            type: 'warning',
            buttons: ['取消', '覆盖'],
            title: '远程仓库已存在',
            message: '本地仓库已有关联的远程仓库 "origin"。',
            detail: `您想将其覆盖为新的 GitHub 仓库 "${newRepoUrl}" 吗？此操作不可撤销。`,
            defaultId: 0,
            cancelId: 0
        });

        if (response === 0) { // 用户点击了 "取消"
            console.log('[IPC-GitHub] User cancelled remote overwrite.');
            return false;
        }

        // 用户同意覆盖，先移除
        console.log('[IPC-GitHub] User approved overwrite. Removing existing origin...');
        const { execFile } = require('child_process');
        const { promisify } = require('util');
        const execFileAsync = promisify(execFile);
        try {
            await execFileAsync('git', ['remote', 'remove', 'origin'], { cwd: folderPath });
        } catch (e: any) {
            console.error('[IPC-GitHub] Failed to remove origin:', e.message);
            throw new Error(`移除旧的 origin 失败: ${e.message}`);
        }
    }

    // 添加新的 remote
    console.log(`[IPC-GitHub] Adding remote origin: ${newRepoUrl}`);
    const remoteAdded = await git.addRemote(folderPath, 'origin', newRepoUrl);
    if (!remoteAdded) {
        throw new Error('添加新的 remote origin 失败');
    }
    return true;
}

// --- 注册处理器 ---
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

    // --- 获取仓库列表 ---
    ipcMain.handle(githubChannels.LIST_REPOS, async () => {
        let token = await auth.getGitHubToken();
        if (!token) {
            try {
                // 如果没 token，触发一次认证
                token = await auth.startGitHubAuth(state.getMainWindow());
            } catch (e: any) {
                console.error('[IPC-ListRepos] Auth flow failed:', e.message);
                throw new Error('需要 GitHub 授权');
            }
        }
        // 复用 lib/github-auth.ts 中的 listUserRepos
        return await auth.listUserRepos(token);
    });

    // --- 关联已有仓库 ---
    ipcMain.handle(githubChannels.LINK_REMOTE, async (_event, { repoUrl }: { repoUrl: string }) => {
        const folderPath = state.getFolder();
        if (!folderPath) {
            return { success: false, error: 'No folder open' };
        }

        try {
            // 1. 检查本地仓库状态
            const status = await git.getGitStatus(folderPath);
            if (status === null) {
                await git.initRepo(folderPath);
                console.warn('[IPC-LinkRemote] Linking to an uninitialized repo. Initializing...');
            }

            // 2. 安全地设置远程仓库
            const authorized = await checkAndSetRemote(state.getMainWindow(), folderPath, repoUrl);
            if (!authorized) {
                return { success: false, error: '用户取消了操作' };
            }

            // 3. 推送到 GitHub
            const currentBranch = await git.getCurrentBranch(folderPath) || 'main';
            console.log(`[IPC-LinkRemote] Pushing to origin ${currentBranch}...`);
            const pushed = await git.pushToRemote(folderPath, 'origin', currentBranch);
            if (!pushed) {
                throw new Error('推送失败。请确保本地分支与远程默认分支一致，或远程仓库不为空。');
            }

            // 4. 通知渲染进程成功
            state.getMainWindow().webContents.send(GITHUB_EVENTS.PUBLISH_SUCCESS);
            return { success: true, error: null };

        } catch (e: any) {
            console.error('[IPC-LinkRemote] Link failed:', e.message);
            return { success: false, error: e.message };
        }
    });

    // --- 发布新仓库---
    ipcMain.handle(githubChannels.PUBLISH_REPO, async (_event, { repoName, isPrivate }: { repoName: string, isPrivate: boolean }) => {
        const folderPath = state.getFolder();
        if (!folderPath) {
            return { success: false, error: 'No folder open' };
        }

        try {
            console.log('[Publish] Starting publish process...', { repoName, isPrivate });

            // 1. 获取 Token
            let token = await auth.getGitHubToken();
            if (!token) {
                console.log('[Publish] No token found, starting auth...');
                token = await auth.startGitHubAuth(state.getMainWindow());
            }

            // 2. 检查本地是否是 Git 仓库
            const status = await git.getGitStatus(folderPath);
            if (status === null) {
                console.log('[Publish] No Git repo detected, initializing...');
                await git.initRepo(folderPath);

                // 创建 README.md
                const readmePath = path.join(folderPath, 'README.md');
                try {
                    await fs.promises.access(readmePath);
                } catch {
                    await fs.promises.writeFile(readmePath, `# ${repoName}\n`);
                }

                // 暂存所有文件并提交
                await git.stageFile(folderPath, '.');
                await git.commit(folderPath, 'Initial commit');
            } else {
                // 检查是否有提交
                console.log('[Publish] Checking for existing commits...');
                const { execFile } = require('child_process');
                const { promisify } = require('util');
                const execFileAsync = promisify(execFile);
                try {
                    await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: folderPath });
                } catch {
                    console.log('[Publish] No commits found, creating initial commit...');
                    await git.stageFile(folderPath, '.');
                    const committed = await git.commit(folderPath, 'Initial commit');
                    if (!committed) {
                        throw new Error('创建初始提交失败');
                    }
                }
            }

            // 3. 获取当前分支名
            let currentBranch = await git.getCurrentBranch(folderPath);
            if (!currentBranch) {
                const { execFile } = require('child_process');
                const { promisify } = require('util');
                const execFileAsync = promisify(execFile);
                try {
                    await execFileAsync('git', ['branch', '-M', 'main'], { cwd: folderPath });
                    currentBranch = 'main';
                } catch {
                    currentBranch = 'master'; // Fallback
                }
            }
            console.log('[Publish] Using branch:', currentBranch);

            // 4. 在 GitHub 上创建仓库
            console.log(`[Publish] Creating GitHub repo: ${repoName}`);
            const cloneUrl = await auth.createGitHubRepo(token, repoName, isPrivate);
            console.log('[Publish] Repo created:', cloneUrl);

            // 5. 安全地检查并添加远程仓库
            const authorized = await checkAndSetRemote(state.getMainWindow(), folderPath, cloneUrl);
            if (!authorized) {
                // 如果用户在 'checkAndSetRemote' 中取消了操作，我们需要删除刚刚创建的 GitHub 仓库吗？
                // 暂时不删除，让用户手动处理。只返回错误。
                throw new Error('用户取消了覆盖本地 origin 的操作');
            }

            // 6. 推送到 GitHub
            console.log(`[Publish] Pushing to origin ${currentBranch}...`);
            const pushed = await git.pushToRemote(folderPath, 'origin', currentBranch);
            if (!pushed) {
                throw new Error('Failed to push to remote');
            }

            console.log('[Publish] Publish successful!');

            // 7. 通知渲染进程成功
            state.getMainWindow().webContents.send(GITHUB_EVENTS.PUBLISH_SUCCESS);
            return {
                success: true,
                error: null,
                repoUrl: cloneUrl.replace('.git', '')
            };

        } catch (e: any) {
            console.error('[IPC-Publish] Publish failed:', e.message);
            // (您原有的错误消息处理逻辑保持不变)
            let errorMessage = e.message;
            if (e.message.includes('name already exists')) {
                errorMessage = `仓库 "${repoName}" 已存在于你的 GitHub 账户中`;
            } else if (e.message.includes('Authentication failed')) {
                errorMessage = 'GitHub 认证失败，请重新授权';
            }
            return { success: false, error: errorMessage };
        }
    });
};