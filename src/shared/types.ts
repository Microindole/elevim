// src/shared/types.ts
import { GitStatusMap, GitFileChange, GitBranch, GitCommit, GitDiff } from "../main/lib/git-service";

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

// Keymap 结构
export type Keymap = Record<CommandId, string>;

// 设置接口
export interface AppSettings {
    fontSize: number;
    keymap: Keymap;
}

export interface SearchResult {
    filePath: string;
    line: number;
    match: string;
}

// 搜索选项接口
export interface SearchOptions {
    searchTerm: string;
    isCaseSensitive: boolean;
    isRegex: boolean;
    isWholeWord: boolean;
}

// 替换选项接口
export interface ReplaceOptions extends SearchOptions {
    replaceTerm: string;
}

export interface IElectronAPI {
    onFileOpen: (callback: (data: { content: string; filePath: string }) => void) => () => void;
    saveFile: (content: string) => Promise<string | null>;
    onTriggerSave: (callback: () => void) => () => void;
    setTitle: (title: string) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    showOpenDialog: () => void;
    triggerNewFile: () => void;
    triggerSaveFile: () => void;
    triggerSaveAsFile: () => void;
    onNewFile: (callback: () => void) => () => void;
    showSaveDialog: () => Promise<'save' | 'dont-save' | 'cancel'>;
    openFolder: () => Promise<any | null>;
    openFile: (filePath: string) => Promise<string | null>;
    getSettings: () => Promise<AppSettings>;
    setSetting: (key: string, value: any) => void;
    terminalInit: () => void;
    terminalWrite: (data: string) => void;
    terminalResize: (size: { cols: number, rows: number }) => void;
    onTerminalData: (callback: (data: string) => void) => () => void;
    getGitStatus: () => Promise<Record<string, string>>;
    readDirectory: (folderPath: string) => Promise<any | null>;
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

    onOpenFolderFromCli: (callback: (tree: any) => void) => () => void;
    onOpenFileFromCli: (callback: (data: { content: string; filePath: string }) => void) => () => void;
    onOpenDiffFromCli: (callback: (filePath: string) => void) => () => void;

    globalSearch: (options: SearchOptions) => Promise<SearchResult[]>;
    globalReplace: (options: ReplaceOptions) => Promise<string[]>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}