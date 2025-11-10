// src/main/ipc-handlers/file.handlers.ts
import { IpcMain, dialog } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'path';
import { readDirectory, searchInDirectory, replaceInDirectory } from '../lib/file-system';
import { SearchOptions, ReplaceOptions } from '../../shared/types';
import { IpcHandlerSharedState } from './state';
import { fileChannels, IPC_CHANNELS } from '../../shared/constants'; // <-- 关键修改

// 1. (已删除本地定义)

// 2. 导出注册函数
export const registerFileHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {

    // --- 文件 & 文件夹操作 ---

    ipcMain.on(fileChannels.SHOW_OPEN_DIALOG, async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'html', 'css'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (!canceled && filePaths.length > 0) {
            state.setFile(filePaths[0]);
            try {
                const content = await fs.readFile(state.getFile()!, 'utf-8');
                state.getMainWindow().webContents.send(IPC_CHANNELS.FILE_OPENED, { // <-- 使用保留的事件
                    content: content,
                    filePath: state.getFile()
                });
            } catch (error) {
                console.error('Failed to read file:', error);
            }
        }
    });

    ipcMain.handle(fileChannels.SAVE_FILE, async (_event, content: string): Promise<string | null> => {
        let savePath = state.getFile();
        if (savePath === null) {
            const { canceled, filePath } = await dialog.showSaveDialog(state.getMainWindow(), {
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
            state.setFile(savePath);
            return state.getFile();
        } catch (error) {
            console.error('Failed to save file:', error);
            return null;
        }
    });

    ipcMain.handle(fileChannels.OPEN_FOLDER, async (): Promise<any | null> => {
        const { canceled, filePaths } = await dialog.showOpenDialog(state.getMainWindow(), {
            properties: ['openDirectory'],
        });
        if (canceled || filePaths.length === 0) {
            state.setFolder(null);
            return null;
        }

        const folderPath = filePaths[0];
        state.setFolder(folderPath);
        try {
            const fileTree = await readDirectory(folderPath);
            return {
                name: path.basename(folderPath),
                path: folderPath,
                children: fileTree
            };
        } catch (error) {
            console.error('Failed to read directory:', error);
            state.setFolder(null);
            return null;
        }
    });

    ipcMain.handle(fileChannels.OPEN_FILE, async (_event, filePath: string): Promise<string | null> => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            state.setFile(filePath);
            state.getMainWindow().webContents.send(IPC_CHANNELS.FILE_OPENED, { // <-- 使用保留的事件
                content,
                filePath,
            });
            return content;
        } catch (error) {
            console.error(`Failed to read file: ${filePath}`, error);
            return null;
        }
    });

    ipcMain.handle(fileChannels.READ_DIRECTORY, async (_event, folderPath: string): Promise<any | null> => {
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

    // --- 搜索 & 替换 ---

    ipcMain.handle(fileChannels.GLOBAL_SEARCH, async (_event, options: SearchOptions) => {
        const folder = state.getFolder();
        if (!folder) {
            return [];
        }
        return await searchInDirectory(folder, options, []);
    });

    ipcMain.handle(fileChannels.GLOBAL_REPLACE, async (_event, options: ReplaceOptions) => {
        const folder = state.getFolder();
        if (!folder) {
            return [];
        }
        const { searchTerm, replaceTerm } = options;
        const { response } = await dialog.showMessageBox(state.getMainWindow(), {
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
            return await replaceInDirectory(folder, options);
        } catch (error) {
            console.error('[Replace] Failed to run replaceInDirectory:', error);
            return [];
        }
    });
};