// src/main/ipc-handlers.ts
import { BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'path';
import { IPC_CHANNELS } from '../shared/constants';
import { readSettings, writeSettings } from './lib/settings';
import { readDirectory } from './lib/file-system';

// 使用一个模块级变量来跟踪当前文件路径
let currentFilePath: string | null = null;

export function registerIpcHandlers(mainWindow: BrowserWindow) {

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