// src/main/ipc-handlers/file.handlers.ts
import { IpcMain, dialog } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'path';
import * as jschardet from 'jschardet';
import { readDirectory, searchInDirectory, replaceInDirectory } from '../lib/file-system';
import { SearchOptions, ReplaceOptions } from '../../shared/types';
import { IpcHandlerSharedState } from './state';
import { fileChannels, IPC_CHANNELS } from '../../shared/constants';

// 辅助函数：从 Buffer 检测编码并解码
function decodeBuffer(buffer: Buffer): { content: string, encoding: string } {
    const DEFAULT_ENCODING = 'utf-8';
    try {
        const detection = jschardet.detect(buffer);
        let encoding = (detection && detection.encoding) ? detection.encoding.toLowerCase() : DEFAULT_ENCODING;

        if (encoding === 'ascii' || encoding === 'windows-1252') {
            encoding = DEFAULT_ENCODING;
        }

        console.log(`[Encoding] Detected: ${encoding} (Confidence: ${detection?.confidence || 0})`);

        const content = buffer.toString(encoding as BufferEncoding);
        // 返回大写的编码名称以便显示
        return { content, encoding: encoding.toUpperCase() };

    } catch (e) {
        console.error('[Encoding] Failed to decode buffer, falling back to UTF-8', e);
        return { content: buffer.toString(DEFAULT_ENCODING), encoding: 'UTF-8' };
    }
}

// 导出注册函数
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
                // --- 读取 Buffer ---
                const buffer = await fs.readFile(state.getFile()!);
                const { content, encoding } = decodeBuffer(buffer);

                state.getMainWindow().webContents.send(IPC_CHANNELS.FILE_OPENED, {
                    content: content,
                    filePath: state.getFile(),
                    encoding: encoding
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
            // --- 读取 Buffer ---
            const buffer = await fs.readFile(filePath);
            const { content, encoding } = decodeBuffer(buffer);

            state.setFile(filePath);
            state.getMainWindow().webContents.send(IPC_CHANNELS.FILE_OPENED, {
                content,
                filePath,
                encoding: encoding
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

    ipcMain.handle(fileChannels.READ_DIRECTORY_FLAT, async (_event, folderPath: string) => {
        try {
            // 只读一层，不递归
            const entries = await fs.readdir(folderPath, { withFileTypes: true });

            const children = entries.map(entry => ({
                name: entry.name,
                // 拼接完整路径
                path: path.join(folderPath, entry.name),
                // 简单判断是否是目录 (不递归读取子节点)
                isDir: entry.isDirectory()
            }));

            // 排序：文件夹在前
            children.sort((a, b) => {
                if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
                return a.isDir ? -1 : 1;
            });

            return { children };
        } catch (error) {
            console.error('[Breadcrumbs] Failed to read flat directory:', folderPath, error);
            return { children: [] };
        }
    });
};