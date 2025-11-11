// src/main/ipc-handlers/git.handlers.ts
import { IpcMain } from 'electron';
import * as gitService from '../lib/git-service';
import { IpcHandlerSharedState } from './state';
import { gitChannels, IPC_CHANNELS } from '../../shared/constants'; // <-- 关键修改

// 1. (已删除本地定义)

// 2. 导出注册函数
export const registerGitHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {

    // Git 状态变化时通知渲染进程
    gitService.onGitStatusChange((statusMap) => {
        const mainWindow = state.getMainWindow();
        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send(IPC_CHANNELS.GIT_STATUS_CHANGE, statusMap); // <-- 使用保留的事件
        }
    });

    ipcMain.handle(gitChannels.INIT_REPO, async () => {
        const folder = state.getFolder();
        if (!folder) return false;

        const result = await gitService.initRepo(folder);
        if (result) {
            // 初始化成功后，必须启动 watcher
            // startGitWatcher 会自动调用 getGitStatus 并 notify 渲染进程
            await gitService.startGitWatcher(folder);
        }
        return result;
    });

    ipcMain.handle(gitChannels.START_GIT_WATCHER, async (_event, folderPath: string) => {
        await gitService.startGitWatcher(folderPath);
    });

    ipcMain.handle(gitChannels.STOP_GIT_WATCHER, async () => {
        await gitService.stopGitWatcher();
    });

    ipcMain.handle(gitChannels.GET_GIT_STATUS, async () => {
        const folder = state.getFolder();
        if (!folder) return {};
        return await gitService.getGitStatus(folder);
    });

    ipcMain.handle(gitChannels.GET_CHANGES, async () => {
        const folder = state.getFolder();
        if (!folder) return [];
        return await gitService.getGitChanges(folder);
    });

    ipcMain.handle(gitChannels.STAGE_FILE, async (_event, filePath: string) => {
        const folder = state.getFolder();
        if (!folder) return false;
        const result = await gitService.stageFile(folder, filePath);
        if (result) {
            const status = await gitService.getGitStatus(folder);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    ipcMain.handle(gitChannels.UNSTAGE_FILE, async (_event, filePath: string) => {
        const folder = state.getFolder();
        if (!folder) return false;
        const result = await gitService.unstageFile(folder, filePath);
        if (result) {
            const status = await gitService.getGitStatus(folder);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    ipcMain.handle(gitChannels.DISCARD_CHANGES, async (_event, filePath: string) => {
        const folder = state.getFolder();
        if (!folder) return false;
        const result = await gitService.discardChanges(folder, filePath);
        if (result) {
            const status = await gitService.getGitStatus(folder);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    ipcMain.handle(gitChannels.COMMIT, async (_event, message: string) => {
        const folder = state.getFolder();
        if (!folder) return false;
        const result = await gitService.commit(folder, message);
        if (result) {
            const status = await gitService.getGitStatus(folder);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    ipcMain.handle(gitChannels.GET_BRANCHES, async () => {
        const folder = state.getFolder();
        if (!folder) return [];
        return await gitService.getBranches(folder);
    });

    ipcMain.handle(gitChannels.CHECKOUT_BRANCH, async (_event, branchName: string) => {
        const folder = state.getFolder();
        if (!folder) return false;
        return await gitService.checkoutBranch(folder, branchName);
    });

    ipcMain.handle(gitChannels.CREATE_BRANCH, async (_event, branchName: string) => {
        const folder = state.getFolder();
        if (!folder) return false;
        return await gitService.createBranch(folder, branchName);
    });

    ipcMain.handle(gitChannels.GET_COMMITS, async (_event, limit: number = 20) => {
        const folder = state.getFolder();
        if (!folder) return [];
        return await gitService.getCommitHistory(folder, limit);
    });

    ipcMain.handle(gitChannels.GET_DIFF, async (_event, filePath: string, staged: boolean) => {
        const folder = state.getFolder();
        if (!folder) return null;
        return await gitService.getFileDiff(folder, filePath, staged);
    });

    ipcMain.handle(gitChannels.GET_CURRENT_BRANCH, async () => {
        const folder = state.getFolder();
        if (!folder) return null;
        return await gitService.getCurrentBranch(folder);
    });

    ipcMain.handle(gitChannels.STASH, async () => {
        const folder = state.getFolder();
        if (!folder) return false;
        return await gitService.stashChanges(folder);
    });

    ipcMain.handle(gitChannels.STASH_POP, async () => {
        const folder = state.getFolder();
        if (!folder) return false;
        return await gitService.popStash(folder);
    });

    ipcMain.handle(gitChannels.CHECKOUT_COMMIT, async (_event, commitHash: string) => {
        const folder = state.getFolder();
        if (!folder) {
            console.warn('[Main] git-checkout-commit called without currentFolderPath');
            return false;
        }
        return await gitService.checkoutCommit(folder, commitHash);
    });

    ipcMain.handle(gitChannels.CREATE_BRANCH_FROM_COMMIT, async (_event, commitHash: string, branchName?: string) => {
        const folder = state.getFolder();
        if (!folder) {
            console.warn('[Main] git-create-branch-from-commit called without currentFolderPath');
            return null;
        }
        return await gitService.createBranchFromCommit(folder, commitHash, branchName);
    });

    ipcMain.handle(gitChannels.OPEN_COMMIT_DIFF, async (_event, commitHash: string) => {
        const folder = state.getFolder();
        if (!folder) {
            console.warn('[Main] git-open-commit-diff called without currentFolderPath');
            return null;
        }
        return await gitService.getCommitDiff(folder, commitHash);
    });

    ipcMain.handle(gitChannels.GET_REMOTES, async () => {
        const folder = state.getFolder();
        if (!folder) return [];
        return await gitService.getRemotes(folder);
    });
};