// src/main/preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

contextBridge.exposeInMainWorld('electronAPI', {
    onFileOpen: (callback: (data: { content: string; filePath: string }) => void) => {
        // 创建一个包装函数，以便我们可以保留对它的引用
        const handler = (_event: IpcRendererEvent, data: { content: string; filePath: string }) => callback(data);
        // 注册监听器
        ipcRenderer.on(IPC_CHANNELS.FILE_OPENED, handler);
        // 返回一个函数，调用它即可移除刚刚注册的监听器
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.FILE_OPENED, handler);
        };
    },
    saveFile: (content: string): Promise<string | null> => {
        return ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE, content);
    },
    onTriggerSave: (callback: () => void) => {
        // 同样地，创建一个可被移除的 handler
        const handler = () => callback();
        ipcRenderer.on('trigger-save-file', handler);
        // 返回清理函数
        return () => {
            ipcRenderer.removeListener('trigger-save-file', handler);
        };
    },
    setTitle: (title: string) => {
        ipcRenderer.send(IPC_CHANNELS.SET_TITLE, title);
    },
    minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    closeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
    showOpenDialog: () => ipcRenderer.send(IPC_CHANNELS.SHOW_OPEN_DIALOG),
    triggerNewFile: () => ipcRenderer.send(IPC_CHANNELS.NEW_FILE),
    triggerSaveFile: () => ipcRenderer.send('trigger-save-file'),
    triggerSaveAsFile: () => ipcRenderer.send('trigger-save-as-file'),
    showSaveDialog: (): Promise<'save' | 'dont-save' | 'cancel'> => {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG);
    },
    openFolder: (): Promise<any | null> => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FOLDER),
    openFile: (filePath: string): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE, filePath),
    onNewFile: (callback: () => void) => {
        // 同样地，创建一个可被移除的 handler
        const handler = () => callback();
        ipcRenderer.on(IPC_CHANNELS.NEW_FILE, handler);
        // 返回清理函数
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.NEW_FILE, handler);
        };
    },
    getSetting: (key: string): Promise<any> => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTING, key),
    setSetting: (key: string, value: any) => ipcRenderer.send(IPC_CHANNELS.SET_SETTING, key, value),
    terminalInit: () => ipcRenderer.send(IPC_CHANNELS.TERMINAL_INIT),
    terminalWrite: (data: string) => ipcRenderer.send(IPC_CHANNELS.TERMINAL_IN, data),
    terminalResize: (size: { cols: number, rows: number }) => ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, size),
    onTerminalData: (callback: (data: string) => void) => {
        const handler = (_event: IpcRendererEvent, data: string) => callback(data);
        ipcRenderer.on(IPC_CHANNELS.TERMINAL_OUT, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_OUT, handler);
        };
    },
    getGitStatus: (): Promise<Record<string, string>> => ipcRenderer.invoke(IPC_CHANNELS.GET_GIT_STATUS),

    readDirectory: (folderPath: string): Promise<any | null> =>
        ipcRenderer.invoke(IPC_CHANNELS.READ_DIRECTORY, folderPath),
});