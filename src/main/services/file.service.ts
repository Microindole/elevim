// src/main/services/file.service.ts
import { EventEmitter } from 'events';
import { dialog, BrowserWindow } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'path';
import * as jschardet from 'jschardet';
import { IFileService } from '../../shared/api-contract';
import { SearchOptions, ReplaceOptions, SearchResult } from '../../shared/types';
import {
    readDirectory,
    searchInDirectory,
    replaceInDirectory,
    buildKnowledgeGraph,
    renameFileWithLinks
} from '../lib/file-system';

// 辅助函数：从 Buffer 检测编码并解码 (复用原代码)
function decodeBuffer(buffer: Buffer): { content: string, encoding: string } {
    const DEFAULT_ENCODING = 'utf-8';
    try {
        const detection = jschardet.detect(buffer);
        let encoding = (detection && detection.encoding) ? detection.encoding.toLowerCase() : DEFAULT_ENCODING;
        if (encoding === 'ascii' || encoding === 'windows-1252') {
            encoding = DEFAULT_ENCODING;
        }
        const content = buffer.toString(encoding as BufferEncoding);
        return { content, encoding: encoding.toUpperCase() };
    } catch (e) {
        return { content: buffer.toString(DEFAULT_ENCODING), encoding: 'UTF-8' };
    }
}

export class FileService extends EventEmitter implements IFileService {
    private currentFilePath: string | null = null;
    private currentFolderPath: string | null = null;

    constructor(private mainWindow: BrowserWindow) {
        super();
    }

    // --- 状态管理 ---
    // 这些方法供主进程其他模块（如 Git）使用，不一定暴露给前端
    public getCurrentFolder() { return this.currentFolderPath; }
    public setCurrentFolder(path: string | null) { this.currentFolderPath = path; }
    public getCurrentFile() { return this.currentFilePath; }
    public setCurrentFile(path: string | null) { this.currentFilePath = path; }

    // --- 接口实现 ---

    async readFile(filePath: string): Promise<string | null> {
        try {
            // 纯读取内容，不处理编码转换 (用于内部逻辑)
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            console.error('Read file failed:', error);
            return null;
        }
    }

    async openFile(filePath: string): Promise<string | null> {
        try {
            // 读取并解码，同时更新状态并发送事件
            const buffer = await fs.readFile(filePath);
            const { content, encoding } = decodeBuffer(buffer);

            this.currentFilePath = filePath;

            // 触发事件通知前端 (兼容旧逻辑)
            // 注意：这里我们通过 RPC 机制自动转发事件，前端可以通过 api.file.on('file-opened', ...) 监听
            this.emit('file-opened', { content, filePath, encoding });

            return content;
        } catch (error) {
            console.error(`Failed to open file: ${filePath}`, error);
            return null;
        }
    }

    async saveFile(filePath: string | null, content: string): Promise<string | null> {
        let savePath = filePath;

        if (!savePath) {
            const result = await this.showSaveDialog();
            if (!result) return null;
            savePath = result;
        }

        try {
            await fs.writeFile(savePath, content, 'utf-8');
            this.currentFilePath = savePath;
            return savePath;
        } catch (error) {
            console.error('Failed to save file:', error);
            return null;
        }
    }

    async openFolder(): Promise<any | null> {
        const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openDirectory'],
        });
        if (canceled || filePaths.length === 0) {
            this.currentFolderPath = null;
            return null;
        }

        const folderPath = filePaths[0];
        this.currentFolderPath = folderPath;

        try {
            const fileTree = await readDirectory(folderPath);
            return {
                name: path.basename(folderPath),
                path: folderPath,
                children: fileTree
            };
        } catch (error) {
            console.error('Failed to read directory:', error);
            this.currentFolderPath = null;
            return null;
        }
    }

    async readDirectory(folderPath: string): Promise<any | null> {
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
    }

    async readDirectoryFlat(folderPath: string): Promise<any> {
        try {
            const entries = await fs.readdir(folderPath, { withFileTypes: true });
            const children = entries.map(entry => ({
                name: entry.name,
                path: path.join(folderPath, entry.name),
                isDir: entry.isDirectory()
            }));
            children.sort((a, b) => {
                if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
                return a.isDir ? -1 : 1;
            });
            return { children };
        } catch (error) {
            console.error('[Breadcrumbs] Failed to read flat directory:', folderPath, error);
            return { children: [] };
        }
    }

    async showOpenDialog(): Promise<void> {
        const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'html', 'css'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!canceled && filePaths.length > 0) {
            // 复用 openFile 逻辑
            await this.openFile(filePaths[0]);
        }
    }

    async showSaveDialog(): Promise<string | null> {
        const { canceled, filePath } = await dialog.showSaveDialog(this.mainWindow, {
            title: 'Save File',
            filters: [
                { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'html', 'css'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (canceled || !filePath) return null;
        return filePath;
    }

    async globalSearch(options: SearchOptions): Promise<SearchResult[]> {
        if (!this.currentFolderPath) return [];
        return await searchInDirectory(this.currentFolderPath, options, []);
    }

    async globalReplace(options: ReplaceOptions): Promise<string[]> {
        if (!this.currentFolderPath) return [];

        const { searchTerm, replaceTerm } = options;
        const { response } = await dialog.showMessageBox(this.mainWindow, {
            type: 'warning',
            buttons: ['全部替换', '取消'],
            title: '确认替换',
            message: `您确定要在所有文件中将 "${searchTerm}" 替换为 "${replaceTerm}" 吗？`,
            detail: '此操作不可撤销！',
            defaultId: 1,
            cancelId: 1
        });

        if (response === 1) return [];

        try {
            return await replaceInDirectory(this.currentFolderPath, options);
        } catch (error) {
            console.error('[Replace] Failed:', error);
            return [];
        }
    }

    async getGraphData(rootPath?: string): Promise<any> {
        // 如果没有传 rootPath，尝试使用当前打开的文件夹
        const targetPath = rootPath || this.currentFolderPath;
        if (!targetPath) return { nodes: [], links: [] };
        return await buildKnowledgeGraph(targetPath);
    }

    async renameFile(oldPath: string, newPath: string): Promise<{ success: boolean, modifiedCount: number, error?: string }> {
        if (!this.currentFolderPath) return { success: false, modifiedCount: 0, error: 'No folder open' };
        return await renameFileWithLinks(this.currentFolderPath, oldPath, newPath);
    }
}