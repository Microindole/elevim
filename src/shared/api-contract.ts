// src/shared/api-contract.ts
import { SearchOptions, SearchResult, ReplaceOptions, AppSettings, EditorColors } from './types';
import { GitStatusMap, GitFileChange, GitBranch, GitCommit, GitDiff } from '../main/lib/git/types';

// --- File Service ---
export interface IFileService {
    readFile(filePath: string): Promise<string | null>;
    saveFile(filePath: string, content: string): Promise<string | null>;
    openFile(filePath: string): Promise<string | null>;
    openFolder(): Promise<any | null>;
    readDirectory(folderPath: string): Promise<any | null>;
    readDirectoryFlat(folderPath: string): Promise<any>;
    globalSearch(options: SearchOptions): Promise<SearchResult[]>;
    globalReplace(options: ReplaceOptions): Promise<string[]>;
    getGraphData(rootPath: string): Promise<any>;
    renameFile(oldPath: string, newPath: string): Promise<{ success: boolean, modifiedCount: number, error?: string }>;
    showOpenDialog(): Promise<void>;
    showSaveDialog(): Promise<string | null>;
    // Events
    on(event: 'file-opened', listener: (data: { filePath: string, content: string, encoding: string }) => void): void;
    on(event: 'new-file', listener: () => void): void;
}

// --- Git Service ---
export interface IGitService {
    initRepo(folderPath: string): Promise<boolean>;
    startWatcher(folderPath: string): Promise<void>;
    stopWatcher(): Promise<void>;
    getStatus(folderPath: string): Promise<GitStatusMap | null>;
    getChanges(folderPath: string): Promise<GitFileChange[]>;
    stageFile(folderPath: string, filePath: string): Promise<boolean>;
    unstageFile(folderPath: string, filePath: string): Promise<boolean>;
    discardChanges(folderPath: string, filePath: string): Promise<boolean>;
    commit(folderPath: string, message: string): Promise<boolean>;
    getBranches(folderPath: string): Promise<GitBranch[]>;
    checkoutBranch(folderPath: string, branchName: string): Promise<boolean>;
    createBranch(folderPath: string, branchName: string): Promise<boolean>;
    getCommits(folderPath: string, limit?: number, skip?: number): Promise<GitCommit[]>;
    getCommitDetails(folderPath: string, commitHash: string): Promise<{ additions: number; deletions: number; files: string[] } | null>;
    getDiff(folderPath: string, filePath: string, staged: boolean): Promise<GitDiff | null>;
    getCurrentBranch(folderPath: string): Promise<string | null>;
    stash(folderPath: string): Promise<boolean>;
    stashPop(folderPath: string): Promise<boolean>;
    checkoutCommit(folderPath: string, commitHash: string): Promise<boolean>;
    createBranchFromCommit(folderPath: string, commitHash: string, branchName?: string): Promise<string | null>;
    openCommitDiff(folderPath: string, commitHash: string): Promise<string | null>;
    getRemotes(folderPath: string): Promise<string[]>;
    // Events
    on(event: 'status-change', listener: (status: GitStatusMap | null) => void): void;
}

// --- Terminal Service ---
export interface ITerminalService {
    // 创建终端，支持传入 cwd，返回终端 ID
    createTerminal(options?: { cwd?: string }): Promise<string>;

    // 针对特定 ID 的操作
    write(termId: string, data: string): Promise<void>;
    resize(termId: string, cols: number, rows: number): Promise<void>;
    dispose(termId: string): Promise<void>;

    // 获取当前活动终端列表
    listTerminals(): Promise<string[]>;

    // Events
    // data 事件结构变为 { termId, data }
    on(event: 'data', listener: (payload: { termId: string, data: string }) => void): void;
    // exit 事件
    on(event: 'exit', listener: (payload: { termId: string, code: number }) => void): void;
}

// --- Settings Service ---
export interface ISettingsService {
    getSettings(): Promise<AppSettings>;
    setSetting(key: string, value: any): Promise<void>;
    importTheme(): Promise<{ success: boolean, data?: { name: string, colors: any }, message?: string }>;
    openSettingsFolder(): Promise<boolean>;
}

// --- Window Service ---
export interface IWindowService {
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    close(): Promise<void>;
    setTitle(title: string): Promise<void>;
    setFullScreen(fullscreen: boolean): Promise<void>;
    showSaveDialog(): Promise<'save' | 'dont-save' | 'cancel'>;
    showMessageBox(options: any): Promise<any>;
    showConfirmBox(options: any): Promise<boolean>;
}

// --- Menu Service ---
export interface IMenuService {
    triggerNewFile(): Promise<void>;
    triggerSaveFile(): Promise<void>;
    triggerSaveAsFile(): Promise<void>;
    // Events
    on(event: 'trigger-save', listener: () => void): void;
}

// --- GitHub Service ---
export interface IGitHubService {
    startAuth(): Promise<boolean>;
    publishRepo(folderPath: string, repoName: string, isPrivate: boolean): Promise<{ success: boolean, error: string | null, repoUrl?: string }>;
    getTokenStatus(): Promise<boolean>;
    listRepos(): Promise<Array<{name: string, url: string, private: boolean}>>;
    linkRemote(folderPath: string, repoUrl: string): Promise<{ success: boolean, error: string | null }>;
    // Events
    on(event: 'publish-success', listener: () => void): void;
}

// --- Session Service ---
export interface ISessionService {
    getSession(): Promise<any>;
    saveSession(session: any): Promise<void>;
}

// --- LSP Service ---
export interface ILspService {
    start(languageId: string): Promise<void>;
    send(languageId: string, message: any): Promise<void>;
    request(languageId: string, message: any): Promise<any>;
    // Events
    on(event: 'notification', listener: (languageId: string, method: string, params: any) => void): void;
}

// --- CLI Service (用于接收启动参数) ---
export interface ICliService {
    // Events
    on(event: 'open-folder', listener: (tree: any) => void): void;
    on(event: 'open-file', listener: (data: { content: string; filePath: string }) => void): void;
    on(event: 'open-diff', listener: (filePath: string) => void): void;
}

// --- API 总表 ---
export interface AppApi {
    file: IFileService;
    git: IGitService;
    terminal: ITerminalService;
    settings: ISettingsService;
    window: IWindowService;
    menu: IMenuService;
    github: IGitHubService;
    session: ISessionService;
    lsp: ILspService;
    cli: ICliService;
}