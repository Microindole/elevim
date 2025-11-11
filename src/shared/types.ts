// src/shared/types.ts
import { GitStatusMap, GitFileChange, GitBranch, GitCommit, GitDiff } from "../main/lib/git/types";

// --- 应用内命令 (用于快捷键) ---
export type CommandId =
    | 'app.quit'
    | 'file.new'
    | 'file.open'
    | 'file.openFolder'
    | 'file.save'
    | 'file.saveAs'
    | 'view.togglePalette'
    | 'view.toggleTerminal'
    | 'view.toggleGitPanel'
    | 'view.toggleSearchPanel'
    | 'editor.save';

// --- 设置 ---
export type Keymap = Record<CommandId, string>;

export interface AppSettings {
    fontSize: number;
    keymap: Keymap;
}

// --- 搜索 ---
export interface SearchResult {
    filePath: string;
    line: number;
    match: string;
}

export interface SearchOptions {
    searchTerm: string;
    isCaseSensitive: boolean;
    isRegex: boolean;
    isWholeWord: boolean;
}

export interface ReplaceOptions extends SearchOptions {
    replaceTerm: string;
}

// --- Preload 暴露的 API 接口 ---

// --- 文件 & 文件夹 API ---
interface IFileAPI {
    onFileOpen: (callback: (data: { content: string; filePath: string }) => void) => () => void;
    onNewFile: (callback: () => void) => () => void;
    saveFile: (content: string) => Promise<string | null>;
    openFile: (filePath: string) => Promise<string | null>;
    openFolder: () => Promise<any | null>;
    readDirectory: (folderPath: string) => Promise<any | null>;
    showOpenDialog: () => void;
    globalSearch: (options: SearchOptions) => Promise<SearchResult[]>;
    globalReplace: (options: ReplaceOptions) => Promise<string[]>;
}

// --- 窗口 & 对话框 API ---
interface IWindowAPI {
    setTitle: (title: string) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    showSaveDialog: () => Promise<'save' | 'dont-save' | 'cancel'>;
    showMessageBox: (options: any) => Promise<any>;
    showConfirmBox: (options: any) => Promise<boolean>;
}

// --- 菜单/快捷键 API ---
interface IMenuAPI {
    onTriggerSave: (callback: () => void) => () => void;
    triggerNewFile: () => void;
    triggerSaveFile: () => void;
    triggerSaveAsFile: () => void;
}

// --- 设置 API ---
interface ISettingsAPI {
    getSettings: () => Promise<AppSettings>;
    setSetting: (key: string, value: any) => void;
}

// --- 终端 API ---
interface ITerminalAPI {
    terminalInit: () => void;
    terminalWrite: (data: string) => void;
    terminalResize: (size: { cols: number, rows: number }) => void;
    onTerminalData: (callback: (data: string) => void) => () => void;
}

// --- Git API ---
interface IGitAPI {
    getGitStatus: () => Promise<Record<string, string> | null>;
    startGitWatcher: (folderPath: string) => void;
    stopGitWatcher: () => void;
    onGitStatusChange: (callback: (status: GitStatusMap | null) => void) => () => void;
    gitGetChanges: () => Promise<GitFileChange[]>;
    gitStageFile: (filePath: string) => Promise<boolean>;
    gitUnstageFile: (filePath: string) => Promise<boolean>;
    gitDiscardChanges: (filePath: string) => Promise<boolean>;
    gitCommit: (message: string) => Promise<boolean>;
    gitGetBranches: () => Promise<GitBranch[]>;
    gitCheckoutBranch: (branchName: string) => Promise<boolean>;
    gitCreateBranch: (branchName: string) => Promise<boolean>;
    gitGetCommits: (limit?: number) => Promise<GitCommit[]>;
    gitGetDiff: (filePath: string, staged: boolean) => Promise<GitDiff | null>;
    gitGetCurrentBranch: () => Promise<string | null>;
    gitStash: () => Promise<boolean>;
    gitStashPop: () => Promise<boolean>;
    gitCheckoutCommit: (commitHash: string) => Promise<boolean>;
    gitCreateBranchFromCommit: (commitHash: string, branchName?: string) => Promise<string | null>;
    openCommitDiff: (commitHash: string) => Promise<string | null>;
    gitInitRepo: () => Promise<boolean>;
    gitGetRemotes: () => Promise<string[]>;
}

interface IGitHubAPI {
    startAuth: () => Promise<boolean>;
    publishRepo: (options: { repoName: string, isPrivate: boolean }) => Promise<{ success: boolean, error: string | null }>;
    getTokenStatus: () => Promise<boolean>;
    onPublishSuccess: (callback: () => void) => () => void;
}

// --- CLI API ---
interface ICliAPI {
    onOpenFolderFromCli: (callback: (tree: any) => void) => () => void;
    onOpenFileFromCli: (callback: (data: { content: string; filePath: string }) => void) => () => void;
    onOpenDiffFromCli: (callback: (filePath: string) => void) => () => void;
}


// --- 组合的最终 API ---
export interface IElectronAPI {
    file: IFileAPI;
    window: IWindowAPI;
    menu: IMenuAPI;
    settings: ISettingsAPI;
    terminal: ITerminalAPI;
    git: IGitAPI;
    cli: ICliAPI;
    github: IGitHubAPI;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}