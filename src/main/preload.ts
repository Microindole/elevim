// src/main/preload.ts

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

console.log('[Preload] Script loaded successfully!'); // <--- 添加日志

try {
    contextBridge.exposeInMainWorld('electronAPI', {
        onFileOpen: (callback: (content: string) => void) => {
            ipcRenderer.on(IPC_CHANNELS.FILE_OPENED, (_event, content) => callback(content));
        },
    });
    console.log('[Preload] contextBridge exposed electronAPI.'); // <--- 添加成功日志
} catch (error) {
    console.error('[Preload] Failed to expose via contextBridge:', error); // <--- 添加错误日志
}