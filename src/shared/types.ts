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
export interface IElectronAPI {

    // --- 文件 & 文件夹操作 ---
    onFileOpen: (callback: (data: { content: string; filePath: string }) => void) => () => void;
    onNewFile: (callback: () => void) => () => void;
    saveFile: (content: string) => Promise<string | null>;
    openFile: (filePath: string) => Promise<string | null>;
    openFolder: () => Promise<any | null>;
    readDirectory: (folderPath: string) => Promise<any | null>;
    showOpenDialog: () => void;

    // --- 窗口 & 对话框 ---
    setTitle: (title: string) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    showSaveDialog: () => Promise<'save' | 'dont-save' | 'cancel'>;

    // --- 菜单/快捷键触发 (渲染进程监听) ---
    onTriggerSave: (callback: () => void) => () => void;
    triggerNewFile: () => void;
    triggerSaveFile: () => void;
    triggerSaveAsFile: () => void;

    // --- 设置 ---
    getSettings: () => Promise<AppSettings>;
    setSetting: (key: string, value: any) => void;

    // --- 终端 ---
    terminalInit: () => void;
    terminalWrite: (data: string) => void;
    terminalResize: (size: { cols: number, rows: number }) => void;
    onTerminalData: (callback: (data: string) => void) => () => void;

    // --- Git ---
    getGitStatus: () => Promise<Record<string, string>>;
    startGitWatcher: (folderPath: string) => void;
    stopGitWatcher: () => void;
    onGitStatusChange: (callback: (status: GitStatusMap) => void) => () => void;
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

    // --- 搜索 ---
    globalSearch: (options: SearchOptions) => Promise<SearchResult[]>;
    globalReplace: (options: ReplaceOptions) => Promise<string[]>;

    // --- 命令行 (CLI) 启动 ---
    onOpenFolderFromCli: (callback: (tree: any) => void) => () => void;
    onOpenFileFromCli: (callback: (data: { content: string; filePath: string }) => void) => () => void;
    onOpenDiffFromCli: (callback: (filePath: string) => void) => () => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}