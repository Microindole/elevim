// src/main/preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
// 导入所有通道
import {
    IPC_CHANNELS,
    fileChannels,
    gitChannels,
    menuChannels,
    settingsChannels,
    terminalChannels,
    windowChannels, GITHUB_EVENTS, githubChannels
} from '../shared/constants';
import { GitStatusMap } from "./lib/git/types";
import { AppSettings, SearchOptions, ReplaceOptions } from "../shared/types";

contextBridge.exposeInMainWorld('electronAPI', {

    // --- 命名空间: file ---
    file: {
        onFileOpen: (callback: (data: { content: string; filePath: string; encoding: string }) => void) => {
            const handler = (_event: IpcRendererEvent, data: { content: string; filePath: string; encoding: string }) => callback(data);
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
            return ipcRenderer.invoke(fileChannels.SAVE_FILE, content);
        },
        openFile: (filePath: string): Promise<string | null> => {
            return ipcRenderer.invoke(fileChannels.OPEN_FILE, filePath);
        },
        openFolder: (): Promise<any | null> => {
            return ipcRenderer.invoke(fileChannels.OPEN_FOLDER);
        },
        readDirectory: (folderPath: string): Promise<any | null> => {
            return ipcRenderer.invoke(fileChannels.READ_DIRECTORY, folderPath);
        },
        showOpenDialog: () => {
            ipcRenderer.send(fileChannels.SHOW_OPEN_DIALOG);
        },
        globalSearch: (options: SearchOptions) => {
            return ipcRenderer.invoke(fileChannels.GLOBAL_SEARCH, options);
        },
        globalReplace: (options: ReplaceOptions) => {
            return ipcRenderer.invoke(fileChannels.GLOBAL_REPLACE, options);
        },
        readDirectoryFlat: (folderPath: string): Promise<any> => {
            return ipcRenderer.invoke(fileChannels.READ_DIRECTORY_FLAT, folderPath);
        },
    },

    // --- 命名空间: window ---
    window: {
        setTitle: (title: string) => {
            ipcRenderer.send(windowChannels.SET_TITLE, title);
        },
        minimizeWindow: () => {
            ipcRenderer.send(windowChannels.MINIMIZE);
        },
        maximizeWindow: () => {
            ipcRenderer.send(windowChannels.MAXIMIZE);
        },
        closeWindow: () => {
            ipcRenderer.send(windowChannels.CLOSE);
        },
        showSaveDialog: (): Promise<'save' | 'dont-save' | 'cancel'> => {
            return ipcRenderer.invoke(windowChannels.SHOW_SAVE_DIALOG);
        },
        showMessageBox: (options: any): Promise<any> => {
            return ipcRenderer.invoke(windowChannels.SHOW_MESSAGE_BOX, options);
        },
        showConfirmBox: (options: any): Promise<boolean> => {
            return ipcRenderer.invoke(windowChannels.SHOW_CONFIRM_BOX, options);
        },
    },

    // --- 命名空间: menu ---
    menu: {
        onTriggerSave: (callback: () => void) => {
            const handler = () => callback();
            ipcRenderer.on(IPC_CHANNELS.TRIGGER_SAVE_FILE, handler);
            return () => {
                ipcRenderer.removeListener(IPC_CHANNELS.TRIGGER_SAVE_FILE, handler);
            };
        },
        triggerNewFile: () => {
            ipcRenderer.send(menuChannels.NEW_FILE);
        },
        triggerSaveFile: () => {
            ipcRenderer.send(menuChannels.TRIGGER_SAVE_FILE);
        },
        triggerSaveAsFile: () => {
            ipcRenderer.send(menuChannels.TRIGGER_SAVE_AS_FILE);
        },
    },

    // --- 命名空间: settings ---
    settings: {
        getSettings: (): Promise<AppSettings> => {
            return ipcRenderer.invoke(settingsChannels.GET_SETTINGS);
        },
        setSetting: (key: string, value: any) => {
            ipcRenderer.send(settingsChannels.SET_SETTING, key, value);
        },
        importTheme: (): Promise<{ success: boolean, data?: { name: string, colors: any }, message?: string }> => {
            return ipcRenderer.invoke(settingsChannels.IMPORT_THEME);
        },
        openSettingsFolder: () => {
            return ipcRenderer.invoke(settingsChannels.OPEN_SETTINGS_FOLDER);
        },
    },

    // --- 命名空间: terminal ---
    terminal: {
        terminalInit: () => {
            ipcRenderer.send(terminalChannels.INIT);
        },
        terminalWrite: (data: string) => {
            ipcRenderer.send(terminalChannels.IN, data);
        },
        terminalResize: (size: { cols: number, rows: number }) => {
            ipcRenderer.send(terminalChannels.RESIZE, size);
        },
        onTerminalData: (callback: (data: string) => void) => {
            const handler = (_event: IpcRendererEvent, data: string) => callback(data);
            ipcRenderer.on(IPC_CHANNELS.TERMINAL_OUT, handler);
            return () => {
                ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_OUT, handler);
            };
        },
    },

    // --- 命名空间: git ---
    git: {
        getGitStatus: (): Promise<Record<string, string> | null> => {
            return ipcRenderer.invoke(gitChannels.GET_GIT_STATUS);
        },
        startGitWatcher: (folderPath: string) => {
            ipcRenderer.invoke(gitChannels.START_GIT_WATCHER, folderPath);
        },
        stopGitWatcher: () => {
            ipcRenderer.invoke(gitChannels.STOP_GIT_WATCHER);
        },
        onGitStatusChange: (callback: (status: GitStatusMap | null) => void) => {
            const subscription = (_event: any, status: GitStatusMap | null) => callback(status);
            ipcRenderer.on(IPC_CHANNELS.GIT_STATUS_CHANGE, subscription);
            return () => ipcRenderer.removeListener(IPC_CHANNELS.GIT_STATUS_CHANGE, subscription);
        },
        gitGetChanges: () => {
            return ipcRenderer.invoke(gitChannels.GET_CHANGES);
        },
        gitStageFile: (filePath: string) => {
            return ipcRenderer.invoke(gitChannels.STAGE_FILE, filePath);
        },
        gitUnstageFile: (filePath: string) => {
            return ipcRenderer.invoke(gitChannels.UNSTAGE_FILE, filePath);
        },
        gitDiscardChanges: (filePath: string) => {
            return ipcRenderer.invoke(gitChannels.DISCARD_CHANGES, filePath);
        },
        gitCommit: (message: string) => {
            return ipcRenderer.invoke(gitChannels.COMMIT, message);
        },
        gitGetBranches: () => {
            return ipcRenderer.invoke(gitChannels.GET_BRANCHES);
        },
        gitCheckoutBranch: (branchName: string) => {
            return ipcRenderer.invoke(gitChannels.CHECKOUT_BRANCH, branchName);
        },
        gitCreateBranch: (branchName: string) => {
            return ipcRenderer.invoke(gitChannels.CREATE_BRANCH, branchName);
        },
        gitGetCommits: (limit?: number) => {
            return ipcRenderer.invoke(gitChannels.GET_COMMITS, limit);
        },
        gitGetDiff: (filePath: string, staged: boolean) => {
            return ipcRenderer.invoke(gitChannels.GET_DIFF, filePath, staged);
        },
        gitGetCurrentBranch: () => {
            return ipcRenderer.invoke(gitChannels.GET_CURRENT_BRANCH);
        },
        gitStash: () => {
            return ipcRenderer.invoke(gitChannels.STASH);
        },
        gitStashPop: () => {
            return ipcRenderer.invoke(gitChannels.STASH_POP);
        },
        gitCheckoutCommit: (commitHash: string) => {
            return ipcRenderer.invoke(gitChannels.CHECKOUT_COMMIT, commitHash);
        },
        gitCreateBranchFromCommit: (commitHash: string, branchName?: string) => {
            return ipcRenderer.invoke(gitChannels.CREATE_BRANCH_FROM_COMMIT, commitHash, branchName);
        },
        openCommitDiff: (commitHash: string) => {
            return ipcRenderer.invoke(gitChannels.OPEN_COMMIT_DIFF, commitHash);
        },
        gitInitRepo: () => {
            return ipcRenderer.invoke(gitChannels.INIT_REPO);
        },
        gitGetRemotes: (): Promise<string[]> => {
            return ipcRenderer.invoke(gitChannels.GET_REMOTES);
        },
    },

    github: {
        startAuth: (): Promise<boolean> => {
            return ipcRenderer.invoke(githubChannels.START_AUTH);
        },
        publishRepo: (options: { repoName: string, isPrivate: boolean }): Promise<{ success: boolean, error: string | null }> => {
            return ipcRenderer.invoke(githubChannels.PUBLISH_REPO, options);
        },
        getTokenStatus: (): Promise<boolean> => {
            return ipcRenderer.invoke(githubChannels.GET_TOKEN_STATUS);
        },
        onPublishSuccess: (callback: () => void) => {
            const handler = () => callback();
            ipcRenderer.on(GITHUB_EVENTS.PUBLISH_SUCCESS, handler);
            return () => {
                ipcRenderer.removeListener(GITHUB_EVENTS.PUBLISH_SUCCESS, handler);
            };
        },
        listRepos: (): Promise<Array<{name: string, url: string, private: boolean}>> => {
            return ipcRenderer.invoke(githubChannels.LIST_REPOS);
        },
        linkRemote: (options: { repoUrl: string }): Promise<{ success: boolean, error: string | null }> => {
            return ipcRenderer.invoke(githubChannels.LINK_REMOTE, options);
        },
    },

    // --- 命名空间: cli ---
    cli: {
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
    },

    session: {
        getSession: () => ipcRenderer.invoke('session:get'),
        saveSession: (session: any) => ipcRenderer.send('session:save', session),
    },
});