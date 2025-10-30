// src/shared/types.ts

// IElectronAPI 接口保持原样，我们将在 Window 接口中直接定义类型
import { GitStatusMap, GitFileChange, GitBranch, GitCommit, GitDiff } from "../main/lib/git-service";

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
    getSetting: (key: string) => Promise<any>;
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
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}