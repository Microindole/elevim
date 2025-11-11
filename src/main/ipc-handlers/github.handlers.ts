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
            // 1. 获取 Token (如果不存在，启动认证)
            let token = await auth.getGitHubToken();
            if (!token) {
                token = await auth.startGitHubAuth(state.getMainWindow());
            }

            // 2. 检查本地是否是 Git 仓库
            const status = await git.getGitStatus(folderPath);
            if (status === null) {
                // 不是 Git 仓库，初始化它
                console.log('[Publish] No repo detected, initializing...');
                await git.initRepo(folderPath);
                await git.stageFile(folderPath, '.'); // 暂存所有文件
                await git.commit(folderPath, 'Initial commit');
            }

            // 3. 在 GitHub 上创建仓库
            console.log(`[Publish] Creating GitHub repo: ${repoName}`);
            const cloneUrl = await auth.createGitHubRepo(token, repoName, isPrivate);

            // 4. 关联远程仓库并推送
            console.log(`[Publish] Adding remote origin: ${cloneUrl}`);
            await git.addRemote(folderPath, 'origin', cloneUrl);

            const currentBranch = await git.getCurrentBranch(folderPath) || 'main'; // 默认为 'main'
            console.log(`[Publish] Pushing to origin ${currentBranch}...`);
            await git.pushToRemote(folderPath, 'origin', currentBranch);

            // 5. 通知渲染进程成功
            state.getMainWindow().webContents.send(GITHUB_EVENTS.PUBLISH_SUCCESS);
            return { success: true, error: null };

        } catch (e: any) {
            console.error('[IPC-Publish] Publish failed:', e.message);
            return { success: false, error: e.message };
        }
    });
};