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

// --- 终端设置 ---
// 根据不同操作系统选择合适的 shell
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

let currentFolderPath: string | null = null;
// 使用一个模块级变量来跟踪当前文件路径
let currentFilePath: string | null = null;

export function registerIpcHandlers(mainWindow: BrowserWindow) {

    let localPtyProcess: pty.IPty | null = null;
    let isPtyStarting = false;

    // --- 终端处理 ---

    ipcMain.on(IPC_CHANNELS.TERMINAL_INIT, () => {
        // *** Ignore request if a pty is already running or currently starting ***
        if (localPtyProcess || isPtyStarting) {
            console.warn('[Main] Ignoring redundant TERMINAL_INIT request.');
            return; // <<< Simply exit if already initialized or starting
        }

        isPtyStarting = true; // Set flag: we are now attempting to start
        console.log('[Main] Received TERMINAL_INIT - attempting to spawn.');

        // Kill logic (should ideally not be needed with the check above, but safe fallback)
        if (localPtyProcess) {
            console.log('[Main] Killing existing pty process (unexpected)');
            try { localPtyProcess.kill(); } catch (e) { console.error('[Main] Error killing existing pty:', e); }
            localPtyProcess = null;
        }

        try {
            console.log(`[Main] Spawning shell: ${shell} in ${app.getPath('home')}`);
            const newPty = pty.spawn(shell, [], { // Create in temporary variable
                name: 'xterm-color',
                cols: 80, rows: 30,
                cwd: app.getPath('home'),
                env: process.env
            });

            // Set up listeners *before* assigning to localPtyProcess
            newPty.onData((data: string) => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_OUT, data);
                }
            });

            newPty.onExit(({ exitCode, signal }) => {
                console.log(`[Main] Pty process exited with code: ${exitCode}, signal: ${signal}`);
                // Only nullify if this *is* the pty we think is active
                if (localPtyProcess === newPty) {
                    localPtyProcess = null;
                    isPtyStarting = false; // Allow starting again
                } else {
                    console.log("[Main] An older/orphaned pty process instance exited.");
                }
            });

            // Assign to main variable *after* setup
            localPtyProcess = newPty;
            isPtyStarting = false; // Clear flag: starting is complete
            console.log('[Main] Pty process spawned successfully');

        } catch (e) {
            console.error('[Main] Failed to spawn pty process:', e);
            localPtyProcess = null;
            isPtyStarting = false; // Clear flag: starting failed
            if (!mainWindow.isDestroyed()) {
                // Notify renderer of failure if desired
            }
        }
    });

    // TERMINAL_IN handler: Now correctly checks localPtyProcess which should be stable
    ipcMain.on(IPC_CHANNELS.TERMINAL_IN, (_event, data: string) => {
        if (localPtyProcess) {
            localPtyProcess.write(data);
        } else {
            console.warn('[Main] Attempted to write to non-existent pty process');
        }
    });

    // TERMINAL_RESIZE handler (no changes needed from previous version)
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

    // Window close handler (no changes needed from previous version)
    mainWindow.on('close', () => {
        console.log('[Main] Main window is closing, killing pty process...');
        if (localPtyProcess) {
            try { localPtyProcess.kill(); } catch(e) { console.error('[Main] Error killing pty on window close:', e); }
            localPtyProcess = null;
            isPtyStarting = false;
        }
    });
    // --- 文件操作 ---

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

    // 另存为的核心是清空当前路径，然后触发渲染进程的保存逻辑
    ipcMain.on('trigger-save-as-file', () => {
        currentFilePath = null;
        mainWindow.webContents.send('trigger-save-file');
    });

    // 保存文件（由菜单触发）
    ipcMain.on('trigger-save-file', () => {
        mainWindow.webContents.send('trigger-save-file');
    });

    // --- 目录/文件夹操作 ---

    ipcMain.handle(IPC_CHANNELS.OPEN_FOLDER, async (): Promise<any | null> => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
        });
        if (canceled || filePaths.length === 0) {
            currentFolderPath = null; // 清空文件夹路径
            return null;
        }

        const folderPath = filePaths[0];
        currentFolderPath = folderPath; // --- 记录当前文件夹路径 ---
        try {
            const fileTree = await readDirectory(folderPath);
            // 可以在这里主动获取一次 Git 状态，但不强制
            // getGitStatus(currentFolderPath);
            return {
                name: path.basename(folderPath),
                path: folderPath,
                children: fileTree
            };
        } catch (error) {
            console.error('Failed to read directory:', error);
            currentFolderPath = null; // 出错时也清空
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
        if (!folderPath) return null; // 需要提供路径
        try {
            const fileTree = await readDirectory(folderPath); // 调用已有的函数
            // 注意：这里返回的是子节点数组，需要包装一下符合 FileNode 结构
            return {
                name: path.basename(folderPath),
                path: folderPath,
                children: fileTree
            };
        } catch (error) {
            console.error(`Failed to re-read directory: ${folderPath}`, error);
            return null; // 出错返回 null
        }
    });

    ipcMain.handle(IPC_CHANNELS.GET_GIT_STATUS, async () => {
        if (!currentFolderPath) {
            return {}; // 没有打开文件夹，返回空状态
        }
        return await gitService.getGitStatus(currentFolderPath);
    });


    // --- 窗口控制 ---

    ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => mainWindow.minimize());

    ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => mainWindow.close());

    // --- 对话框 ---

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

    // --- 设置 ---

    ipcMain.handle(IPC_CHANNELS.GET_SETTING, async (_event, key: string) => {
        const settings = await readSettings();
        return settings[key];
    });

    ipcMain.on(IPC_CHANNELS.SET_SETTING, async (_event, key: string, value: any) => {
        const settings = await readSettings();
        settings[key] = value;
        await writeSettings(settings);
    });

    // --- 其他 ---
    ipcMain.on(IPC_CHANNELS.SET_TITLE, (_event, title: string) => {
        // 虽然渲染进程可以自己改标题，但保留这个可以用于主进程主动修改
    });

    // 启动 Git 监听器
    ipcMain.handle(IPC_CHANNELS.START_GIT_WATCHER, async (_event, folderPath: string) => {
        await gitService.startGitWatcher(folderPath);
    });

    // 停止 Git 监听器
    ipcMain.handle(IPC_CHANNELS.STOP_GIT_WATCHER, async () => {
        await gitService.stopGitWatcher();
    });

    // Git 状态变化时通知渲染进程
    gitService.onGitStatusChange((statusMap) => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send(IPC_CHANNELS.GIT_STATUS_CHANGE, statusMap);
        }
    });

    // Git 详细变更列表
    ipcMain.handle(IPC_CHANNELS.GIT_GET_CHANGES, async () => {
        if (!currentFolderPath) return [];
        return await gitService.getGitChanges(currentFolderPath);
    });

    // Git 暂存文件
    ipcMain.handle(IPC_CHANNELS.GIT_STAGE_FILE, async (_event, filePath: string) => {
        if (!currentFolderPath) return false;
        const result = await gitService.stageFile(currentFolderPath, filePath);
        if (result) {
            // 刷新状态
            const status = await gitService.getGitStatus(currentFolderPath);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    // Git 取消暂存
    ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE_FILE, async (_event, filePath: string) => {
        if (!currentFolderPath) return false;
        const result = await gitService.unstageFile(currentFolderPath, filePath);
        if (result) {
            const status = await gitService.getGitStatus(currentFolderPath);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    // Git 丢弃修改
    ipcMain.handle(IPC_CHANNELS.GIT_DISCARD_CHANGES, async (_event, filePath: string) => {
        if (!currentFolderPath) return false;
        const result = await gitService.discardChanges(currentFolderPath, filePath);
        if (result) {
            const status = await gitService.getGitStatus(currentFolderPath);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    // Git 提交
    ipcMain.handle(IPC_CHANNELS.GIT_COMMIT, async (_event, message: string) => {
        if (!currentFolderPath) return false;
        const result = await gitService.commit(currentFolderPath, message);
        if (result) {
            const status = await gitService.getGitStatus(currentFolderPath);
            gitService.notifyStatusChange(status);
        }
        return result;
    });

    // Git 获取分支列表
    ipcMain.handle(IPC_CHANNELS.GIT_GET_BRANCHES, async () => {
        if (!currentFolderPath) return [];
        return await gitService.getBranches(currentFolderPath);
    });

    // Git 切换分支
    ipcMain.handle(IPC_CHANNELS.GIT_CHECKOUT_BRANCH, async (_event, branchName: string) => {
        if (!currentFolderPath) return false;
        return await gitService.checkoutBranch(currentFolderPath, branchName);
    });

    // Git 创建分支
    ipcMain.handle(IPC_CHANNELS.GIT_CREATE_BRANCH, async (_event, branchName: string) => {
        if (!currentFolderPath) return false;
        return await gitService.createBranch(currentFolderPath, branchName);
    });

    // Git 获取提交历史
    ipcMain.handle(IPC_CHANNELS.GIT_GET_COMMITS, async (_event, limit: number = 20) => {
        if (!currentFolderPath) return [];
        return await gitService.getCommitHistory(currentFolderPath, limit);
    });

    // Git 获取文件差异
    ipcMain.handle(IPC_CHANNELS.GIT_GET_DIFF, async (_event, filePath: string, staged: boolean) => {
        if (!currentFolderPath) return null;
        return await gitService.getFileDiff(currentFolderPath, filePath, staged);
    });

    // Git 获取当前分支
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

    // 全局搜索处理器
    ipcMain.handle(IPC_CHANNELS.GLOBAL_SEARCH, async (_event, searchTerm: string) => {
        if (!currentFolderPath) {
            return []; // 如果没有打开文件夹，返回空数组
        }
        return await searchInDirectory(currentFolderPath, searchTerm, []);
    });

    // 全局替换处理器
    ipcMain.handle(IPC_CHANNELS.GLOBAL_REPLACE, async (_event, searchTerm: string, replaceTerm: string) => {
        if (!currentFolderPath) {
            return [];
        }

        // 1. --- 安全确认 ---
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            buttons: ['全部替换', '取消'],
            title: '确认替换',
            message: `您确定要在所有文件中将 "${searchTerm}" 替换为 "${replaceTerm}" 吗？`,
            detail: '此操作不可撤销！',
            defaultId: 1, // 默认选中“取消”
            cancelId: 1
        });

        // 2. 如果用户点击了“取消”(response === 1)
        if (response === 1) {
            return []; // 返回空数组，表示没有文件被修改
        }

        // 3. 如果用户点击了“全部替换”
        try {
            return await replaceInDirectory(currentFolderPath, searchTerm, replaceTerm);
        } catch (error) {
            console.error('[Replace] Failed to run replaceInDirectory:', error);
            return [];
        }
    });
}