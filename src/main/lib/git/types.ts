// 只提取类型定义
export type GitStatus =
    | 'unmodified'
    | 'added'
    | 'modified'
    | 'deleted'
    | 'renamed'
    | 'typechange'
    | 'untracked'
    | 'wd-modified'
    | 'wd-deleted'
    | 'wd-renamed'
    | 'wd-typechange'
    | 'conflicted';

export type GitStatusMap = Record<string, GitStatus>;

export interface GitFileChange {
    path: string;
    status: GitStatus;
    staged: boolean;
}

export interface GitBranch {
    name: string;
    current: boolean;
    remote?: string;
}

export interface GitCommit {
    hash: string;
    parentHashes: string[];
    message: string;
    author: string;
    date: string;
    branch: string;
    graph: ('commit' | 'line' | 'merge-left' | 'merge-right' | 'line-across' | 'empty')[];
    fileChanges?: {
        additions: number;
        deletions: number;
        files: string[];
    };
}

export interface GitDiff {
    additions: number;
    deletions: number;
    changes: string;
}