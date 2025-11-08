// src/main/preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import { GitStatusMap } from "./lib/git-service";
import { AppSettings, SearchOptions, ReplaceOptions } from "../shared/types";

contextBridge.exposeInMainWorld('electronAPI', {

    // --- 文件 & 文件夹操作 ---
    onFileOpen: (callback: (data: { content: string; filePath: string }) => void) => {
        const handler = (_event: IpcRendererEvent, data: { content: string; filePath: string }) => callback(data);
        ipcRenderer.on(IPC_CHANNELS.FILE_OPENED, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.FILE_OPENED, handler);
        };
    },
    onNewFile: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on(IPC_CHANNELS.NEW_FILE, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.NEW_FILE, handler);
        };
    },
    saveFile: (content: string): Promise<string | null> => {
        return ipcRenderer.invoke(IPC_CHANNELS.SAVE_FILE, content);
    },
    openFile: (filePath: string): Promise<string | null> => {
        return ipcRenderer.invoke(IPC_CHANNELS.OPEN_FILE, filePath);
    },
    openFolder: (): Promise<any | null> => {
        return ipcRenderer.invoke(IPC_CHANNELS.OPEN_FOLDER);
    },
    readDirectory: (folderPath: string): Promise<any | null> => {
        return ipcRenderer.invoke(IPC_CHANNELS.READ_DIRECTORY, folderPath);
    },
    showOpenDialog: () => {
        ipcRenderer.send(IPC_CHANNELS.SHOW_OPEN_DIALOG);
    },

    // --- 窗口 & 对话框 ---
    setTitle: (title: string) => {
        ipcRenderer.send(IPC_CHANNELS.SET_TITLE, title);
    },
    minimizeWindow: () => {
        ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE);
    },
    maximizeWindow: () => {
        ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE);
    },
    closeWindow: () => {
        ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE);
    },
    showSaveDialog: (): Promise<'save' | 'dont-save' | 'cancel'> => {
        return ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG);
    },

    // --- 菜单/快捷键触发 (渲染进程监听) ---
    onTriggerSave: (callback: () => void) => {
        const handler = () => callback();
        // (修正) 使用常量
        ipcRenderer.on(IPC_CHANNELS.TRIGGER_SAVE_FILE, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.TRIGGER_SAVE_FILE, handler);
        };
    },
    triggerNewFile: () => {
        ipcRenderer.send(IPC_CHANNELS.NEW_FILE);
    },
    triggerSaveFile: () => {
        // (修正) 使用常量
        ipcRenderer.send(IPC_CHANNELS.TRIGGER_SAVE_FILE);
    },
    triggerSaveAsFile: () => {
        // (修正) 使用常量
        ipcRenderer.send(IPC_CHANNELS.TRIGGER_SAVE_AS_FILE);
    },

    // --- 设置 ---
    getSettings: (): Promise<AppSettings> => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
    },
    setSetting: (key: string, value: any) => {
        ipcRenderer.send(IPC_CHANNELS.SET_SETTING, key, value);
    },

    // --- 终端 ---
    terminalInit: () => {
        ipcRenderer.send(IPC_CHANNELS.TERMINAL_INIT);
    },
    terminalWrite: (data: string) => {
        ipcRenderer.send(IPC_CHANNELS.TERMINAL_IN, data);
    },
    terminalResize: (size: { cols: number, rows: number }) => {
        ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, size);
    },
    onTerminalData: (callback: (data: string) => void) => {
        const handler = (_event: IpcRendererEvent, data: string) => callback(data);
        ipcRenderer.on(IPC_CHANNELS.TERMINAL_OUT, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_OUT, handler);
        };
    },

    // --- Git ---
    getGitStatus: (): Promise<Record<string, string>> => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_GIT_STATUS);
    },
    startGitWatcher: (folderPath: string) => {
        ipcRenderer.invoke(IPC_CHANNELS.START_GIT_WATCHER, folderPath);
    },
    stopGitWatcher: () => {
        ipcRenderer.invoke(IPC_CHANNELS.STOP_GIT_WATCHER);
    },
    onGitStatusChange: (callback: (status: GitStatusMap) => void) => {
        const subscription = (_event: any, status: GitStatusMap) => callback(status);
        ipcRenderer.on(IPC_CHANNELS.GIT_STATUS_CHANGE, subscription);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.GIT_STATUS_CHANGE, subscription);
    },
    gitGetChanges: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_CHANGES);
    },
    gitStageFile: (filePath: string) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_FILE, filePath);
    },
    gitUnstageFile: (filePath: string) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_FILE, filePath);
    },
    gitDiscardChanges: (filePath: string) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD_CHANGES, filePath);
    },
    gitCommit: (message: string) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, message);
    },
    gitGetBranches: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_BRANCHES);
    },
    gitCheckoutBranch: (branchName: string) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT_BRANCH, branchName);
    },
    gitCreateBranch: (branchName: string) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_CREATE_BRANCH, branchName);
    },
    gitGetCommits: (limit?: number) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_COMMITS, limit);
    },
    gitGetDiff: (filePath: string, staged: boolean) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_DIFF, filePath, staged);
    },
    gitGetCurrentBranch: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_CURRENT_BRANCH);
    },
    gitStash: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH);
    },
    gitStashPop: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_STASH_POP);
    },
    gitCheckoutCommit: (commitHash: string) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_CHECKOUT_COMMIT, commitHash);
    },
    gitCreateBranchFromCommit: (commitHash: string, branchName?: string) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_CREATE_BRANCH_FROM_COMMIT, commitHash, branchName);
    },
    openCommitDiff: (commitHash: string) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GIT_OPEN_COMMIT_DIFF, commitHash);
    },

    // --- 搜索 ---
    globalSearch: (options: SearchOptions) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GLOBAL_SEARCH, options);
    },
    globalReplace: (options: ReplaceOptions) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GLOBAL_REPLACE, options);
    },

    // --- 命令行 (CLI) 启动 ---
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
    onOpenDiffFromCli: (callback: (filePath: string) => void) => {
        const handler = (_event: IpcRendererEvent, filePath: string) => callback(filePath);
        ipcRenderer.on(IPC_CHANNELS.OPEN_DIFF_FROM_CLI, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.OPEN_DIFF_FROM_CLI, handler);
        };
    },
});