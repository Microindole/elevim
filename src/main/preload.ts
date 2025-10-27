// src/main/preload.ts

import { contextBridge, ipcRenderer } from 'electron';

// 我们暴露一个名为 'electronAPI' 的全局对象给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 定义一个函数 'onFileOpen'，它允许渲染进程设置一个监听器
    // 当主进程通过 'file-opened' 频道发送数据时，这个监听器就会被触发
    onFileOpen: (callback: (content: string) => void) => {
        ipcRenderer.on('file-opened', (_event, content) => callback(content));
    },
});