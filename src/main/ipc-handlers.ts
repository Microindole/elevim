// src/main/ipc-handlers.ts
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'path';
import { IPC_CHANNELS } from '../shared/constants';
import { readSettings, writeSettings } from './lib/settings';
import { readDirectory } from './lib/file-system';
import * as pty from 'node-pty';
import * as os from 'os';

// --- 终端设置 ---
// 根据不同操作系统选择合适的 shell
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

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
        if (canceled || filePaths.length === 0) return null;

        const folderPath = filePaths[0];
        try {
            const fileTree = await readDirectory(folderPath);
            return {
                name: path.basename(folderPath),
                path: folderPath,
                children: fileTree
            };
        } catch (error) {
            console.error('Failed to read directory:', error);
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
}