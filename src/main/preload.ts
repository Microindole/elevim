// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

contextBridge.exposeInMainWorld('electronAPI', {
    onFileOpen: (callback: (content: string) => void) => {
        ipcRenderer.on(IPC_CHANNELS.FILE_OPENED, (_event, content) => callback(content));
    },
    saveFile: (content: string): Promise<string | null> => {
        // 使用 invoke/handle 模式进行双向通信
        // 'invoke' 发送请求，并等待主进程 'handle' 后返回的结果
        return ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE, content);
    },
    onTriggerSave: (callback: () => void) => {
        // 监听来自主进程的触发信号
        ipcRenderer.on('trigger-save-file', () => callback());
    }
});