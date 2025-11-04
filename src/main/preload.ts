// src/main/preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import {GitStatusMap} from "./lib/git-service";

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

    startGitWatcher: (folderPath: string) => ipcRenderer.invoke(IPC_CHANNELS.START_GIT_WATCHER, folderPath),
    stopGitWatcher: () => ipcRenderer.invoke(IPC_CHANNELS.STOP_GIT_WATCHER),
    onGitStatusChange: (callback: (status: GitStatusMap) => void) => {
        const subscription = (_event: any, status: GitStatusMap) => callback(status);
        ipcRenderer.on(IPC_CHANNELS.GIT_STATUS_CHANGE, subscription);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.GIT_STATUS_CHANGE, subscription);
    },
    gitGetChanges: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_CHANGES),
    gitStageFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_FILE, filePath),
    gitUnstageFile: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_FILE, filePath),
    gitDiscardChanges: (filePath: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD_CHANGES, filePath),
    gitCommit: (message: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, message),
    gitGetBranches: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_BRANCHES),
    gitCheckoutBranch: (branchName: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT_BRANCH, branchName),
    gitCreateBranch: (branchName: string) => ipcRenderer.invoke(IPC_CHANNELS.GIT_CREATE_BRANCH, branchName),
    gitGetCommits: (limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_COMMITS, limit),
    gitGetDiff: (filePath: string, staged: boolean) => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_DIFF, filePath, staged),
    gitGetCurrentBranch: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_CURRENT_BRANCH),
    gitStash: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH),
    gitStashPop: () => ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH_POP),

    onOpenFolderFromCli: (callback: (tree: any) => void) => {
        const handler = (_event: IpcRendererEvent, tree: any) => callback(tree);
        ipcRenderer.on(IPC_CHANNELS.OPEN_FOLDER_FROM_CLI, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.OPEN_FOLDER_FROM_CLI, handler);
        };
    },
    onOpenFileFromCli: (callback: (data: { content: string; filePath: string }) => void) => {
        const handler = (_event: IpcRendererEvent, data: { content: string; filePath: string }) => callback(data);
        ipcRenderer.on(IPC_CHANNELS.OPEN_FILE_FROM_CLI, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.OPEN_FILE_FROM_CLI, handler);
        };
    },
});