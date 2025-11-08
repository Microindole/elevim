// src/main/ipc-handlers.ts
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'path';
import { IPC_CHANNELS } from '../shared/constants';
import { readSettings, writeSettings } from './lib/settings';
import { readDirectory, searchInDirectory, replaceInDirectory } from './lib/file-system';
import * as pty from 'node-pty';
import * as os from 'os';
import * as gitService from './lib/git-service';
import { SearchOptions, ReplaceOptions, AppSettings } from '../shared/types';

// --- 终端设置 ---
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

// --- 模块级状态 ---
let currentFolderPath: string | null = null;
let currentFilePath: string | null = null;

export function registerIpcHandlers(mainWindow: BrowserWindow) {

    let localPtyProcess: pty.IPty | null = null;
    let isPtyStarting = false;

    // --- 终端处理 ---

    ipcMain.on(IPC_CHANNELS.TERMINAL_INIT, () => {
        if (localPtyProcess || isPtyStarting) {
            console.warn('[Main] Ignoring redundant TERMINAL_INIT request.');
            return;
        }
        isPtyStarting = true;
        console.log('[Main] Received TERMINAL_INIT - attempting to spawn.');

        if (localPtyProcess) {
            console.log('[Main] Killing existing pty process (unexpected)');
            try { localPtyProcess.kill(); } catch (e) { console.error('[Main] Error killing existing pty:', e); }
            localPtyProcess = null;
        }

        try {
            console.log(`[Main] Spawning shell: ${shell} in ${app.getPath('home')}`);
            const newPty = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: 80, rows: 30,
                cwd: app.getPath('home'),
                env: process.env
            });

            newPty.onData((data: string) => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_OUT, data);
                }
            });

            newPty.onExit(({ exitCode, signal }) => {
                console.log(`[Main] Pty process exited with code: ${exitCode}, signal: ${signal}`);
                if (localPtyProcess === newPty) {
                    localPtyProcess = null;
                    isPtyStarting = false;
                } else {
                    console.log("[Main] An older/orphaned pty process instance exited.");
                }
            });

            localPtyProcess = newPty;
            isPtyStarting = false;
            console.log('[Main] Pty process spawned successfully');

        } catch (e) {
            console.error('[Main] Failed to spawn pty process:', e);
            localPtyProcess = null;
            isPtyStarting = false;
        }
    });

    ipcMain.on(IPC_CHANNELS.TERMINAL_IN, (_event, data: string) => {
        if (localPtyProcess) {
            localPtyProcess.write(data);
        } else {
            console.warn('[Main] Attempted to write to non-existent pty process');
        }
    });

    ipcMain.on(IPC_CHANNELS.TERMINAL_RESIZE, (_event, size: { cols: number, rows: number }) => {
        if (localPtyProcess && size && typeof size.cols === 'number' && typeof size.rows === 'number' && size.cols > 0 && size.rows > 0) {
            try {
                localPtyProcess.resize(size.cols, size.rows);
            } catch (e) {
                console.error('[Main] Failed to resize pty:', e);
            }
        } else {
            console.warn('[Main] Invalid resize parameters received or pty not running:', size);
        }
    });

    // 终端相关的窗口关闭处理
    mainWindow.on('close', () => {
        console.log('[Main] Main window is closing, killing pty process...');
        if (localPtyProcess) {
            try { localPtyProcess.kill(); } catch(e) { console.error('[Main] Error killing pty on window close:', e); }
            localPtyProcess = null;
            isPtyStarting = false;
        }
    });

    // --- 文件 & 文件夹操作 ---

    ipcMain.on(IPC_CHANNELS.SHOW_OPEN_DIALOG, async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'html', 'css'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (!canceled && filePaths.length > 0) {
            currentFilePath = filePaths[0];
            try {
                const content = await fs.readFile(currentFilePath, 'utf-8');
                mainWindow.webContents.send(IPC_CHANNELS.FILE_OPENED, {
                    content: content,
                    filePath: currentFilePath
                });
            } catch (error) {
                console.error('Failed to read file:', error);
            }
        }
    });

    ipcMain.handle(IPC_CHANNELS.SAVE_FILE, async (_event, content: string): Promise<string | null> => {
        let savePath = currentFilePath;
        if (savePath === null) {
            const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
                title: 'Save File',
                filters: [
                    { name: 'Text Files', extensions: ['txt', 'md'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            if (canceled || !filePath) return null;
            savePath = filePath;
        }
        try {
            await fs.writeFile(savePath, content, 'utf-8');
            currentFilePath = savePath;
            return currentFilePath;
        } catch (error) {
            console.error('Failed to save file:', error);
            return null;
        }
    });

    ipcMain.on(IPC_CHANNELS.NEW_FILE, () => {
        currentFilePath = null;
        mainWindow.webContents.send(IPC_CHANNELS.NEW_FILE);
    });

    ipcMain.on(IPC_CHANNELS.TRIGGER_SAVE_AS_FILE, () => {
        currentFilePath = null;
        mainWindow.webContents.send(IPC_CHANNELS.TRIGGER_SAVE_FILE);
    });

    ipcMain.on(IPC_CHANNELS.TRIGGER_SAVE_FILE, () => {
        mainWindow.webContents.send(IPC_CHANNELS.TRIGGER_SAVE_FILE);
    });

    ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER, async (): Promise<any | null> => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
        });
        if (canceled || filePaths.length === 0) {
            currentFolderPath = null;
            return null;
        }

        const folderPath = filePaths[0];
        currentFolderPath = folderPath;
        try {
            const fileTree = await readDirectory(folderPath);
            return {
                name: path.basename(folderPath),
                path: folderPath,
                children: fileTree
            };
        } catch (error) {
            console.error('Failed to read directory:', error);
            currentFolderPath = null;
            return null;
        }
    });

    ipcMain.handle(IPC_CHANNELS.OPEN_FILE, async (_event, filePath: string): Promise<string | null> => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            currentFilePath = filePath;
            mainWindow.webContents.send(IPC_CHANNELS.FILE_OPENED, {
                content,
                filePath,
            });
            return content;
        } catch (error) {
            console.error(`Failed to read file: ${filePath}`, error);
            return null;
        }
    });

    ipcMain.handle(IPC_CHANNELS.READ_DIRECTORY, async (_event, folderPath: string): Promise<any | null> => {
        if (!folderPath) return null;
        try {
            const fileTree = await readDirectory(folderPath);
            return {
                name: path.basename(folderPath),
                path: folderPath,
                children: fileTree
            };
        } catch (error) {
            console.error(`Failed to re-read directory: ${folderPath}`, error);
            return null;
        }
    });

    // --- 窗口控制 & 对话框 ---

    ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => mainWindow.minimize());

    ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => mainWindow.close());

    ipcMain.handle(IPC_CHANNELS.SHOW_SAVE_DIALOG, async (): Promise<'save' | 'dont-save' | 'cancel'> => {
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            buttons: ['保存', '不保存', '取消'],
            title: '退出前确认',
            message: '文件有未保存的更改，您想保存它们吗？',
            defaultId: 0,
            cancelId: 2
        });
        if (response === 0) return 'save';
        if (response === 1) return 'dont-save';
        return 'cancel';
    });

    ipcMain.on(IPC_CHANNELS.SET_TITLE, (_event, title: string) => {
        // 标题设置逻辑 (如果需要可以取消注释)
        // if (mainWindow && !mainWindow.isDestroyed()) {
        //     mainWindow.setTitle(title);
        // }
    });

    // --- 设置 ---

    ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
        return await readSettings();
    });

    ipcMain.on(IPC_CHANNELS.SET_SETTING, async (_event, key: keyof AppSettings, value: any) => {
        await writeSettings({ [key]: value });
    });

    // --- Git ---

    ipcMain.handle(IPC_CHANNELS.START_GIT_WATCHER, async (_event, folderPath: string) => {
        await gitService.startGitWatcher(folderPath);
    });

    ipcMain.handle(IPC_CHANNELS.STOP_GIT_WATCHER, async () => {
        await gitService.stopGitWatcher();
    });

    // Git 状态变化时通知渲染进程
    gitService.onGitStatusChange((statusMap) => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send(IPC_CHANNELS.GIT_STATUS_CHANGE, statusMap);
        }
    });

    ipcMain.handle(IPC_CHANNELS.GET_GIT_STATUS, async () => {
        if (!currentFolderPath) {
            return {};
        }
        return await gitService.getGitStatus(currentFolderPath);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_GET_CHANGES, async () => {
        if (!currentFolderPath) return [];
        return await gitService.getGitChanges(currentFolderPath);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_STAGE_FILE, async (_event, filePath: string) => {
        if (!currentFolderPath) return false;
        const result = await gitService.stageFile(currentFolderPath, filePath);
        if (result) {
            const status = await gitService.getGitStatus(currentFolderPath);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE_FILE, async (_event, filePath: string) => {
        if (!currentFolderPath) return false;
        const result = await gitService.unstageFile(currentFolderPath, filePath);
        if (result) {
            const status = await gitService.getGitStatus(currentFolderPath);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    ipcMain.handle(IPC_CHANNELS.GIT_DISCARD_CHANGES, async (_event, filePath: string) => {
        if (!currentFolderPath) return false;
        const result = await gitService.discardChanges(currentFolderPath, filePath);
        if (result) {
            const status = await gitService.getGitStatus(currentFolderPath);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    ipcMain.handle(IPC_CHANNELS.GIT_COMMIT, async (_event, message: string) => {
        if (!currentFolderPath) return false;
        const result = await gitService.commit(currentFolderPath, message);
        if (result) {
            const status = await gitService.getGitStatus(currentFolderPath);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    ipcMain.handle(IPC_CHANNELS.GIT_GET_BRANCHES, async () => {
        if (!currentFolderPath) return [];
        return await gitService.getBranches(currentFolderPath);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_CHECKOUT_BRANCH, async (_event, branchName: string) => {
        if (!currentFolderPath) return false;
        return await gitService.checkoutBranch(currentFolderPath, branchName);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_CREATE_BRANCH, async (_event, branchName: string) => {
        if (!currentFolderPath) return false;
        return await gitService.createBranch(currentFolderPath, branchName);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_GET_COMMITS, async (_event, limit: number = 20) => {
        if (!currentFolderPath) return [];
        return await gitService.getCommitHistory(currentFolderPath, limit);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_GET_DIFF, async (_event, filePath: string, staged: boolean) => {
        if (!currentFolderPath) return null;
        return await gitService.getFileDiff(currentFolderPath, filePath, staged);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_GET_CURRENT_BRANCH, async () => {
        if (!currentFolderPath) return null;
        return await gitService.getCurrentBranch(currentFolderPath);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_STASH, async () => {
        if (!currentFolderPath) return false;
        return await gitService.stashChanges(currentFolderPath);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_STASH_POP, async () => {
        if (!currentFolderPath) return false;
        return await gitService.popStash(currentFolderPath);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_CHECKOUT_COMMIT, async (_event, commitHash: string) => {
        if (!currentFolderPath) {
            console.warn('[Main] git-checkout-commit called without currentFolderPath');
            return false;
        }
        return await gitService.checkoutCommit(currentFolderPath, commitHash);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_CREATE_BRANCH_FROM_COMMIT, async (_event, commitHash: string, branchName?: string) => {
        if (!currentFolderPath) {
            console.warn('[Main] git-create-branch-from-commit called without currentFolderPath');
            return null;
        }
        return await gitService.createBranchFromCommit(currentFolderPath, commitHash, branchName);
    });

    ipcMain.handle(IPC_CHANNELS.GIT_OPEN_COMMIT_DIFF, async (_event, commitHash: string) => {
        if (!currentFolderPath) {
            console.warn('[Main] git-open-commit-diff called without currentFolderPath');
            return null;
        }
        return await gitService.getCommitDiff(currentFolderPath, commitHash);
    });

    // --- 搜索 & 替换 ---

    ipcMain.handle(IPC_CHANNELS.GLOBAL_SEARCH, async (_event, options: SearchOptions) => {
        if (!currentFolderPath) {
            return [];
        }
        return await searchInDirectory(currentFolderPath, options, []);
    });

    ipcMain.handle(IPC_CHANNELS.GLOBAL_REPLACE, async (_event, options: ReplaceOptions) => {
        if (!currentFolderPath) {
            return [];
        }
        const { searchTerm, replaceTerm } = options;
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            buttons: ['全部替换', '取消'],
            title: '确认替换',
            message: `您确定要在所有文件中将 "${searchTerm}" 替换为 "${replaceTerm}" 吗？`,
            detail: '此操作不可撤销！',
            defaultId: 1,
            cancelId: 1
        });
        if (response === 1) { // 对应 "取消"
            return [];
        }
        try {
            return await replaceInDirectory(currentFolderPath, options);
        } catch (error) {
            console.error('[Replace] Failed to run replaceInDirectory:', error);
            return [];
        }
    });
}
