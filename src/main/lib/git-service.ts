// src/main/lib/git-service.ts

// 1. Re-export all types
export * from './git/types';

// 2. Re-export all state/watcher functions
export {
    onGitStatusChange,
    notifyStatusChange,
    startGitWatcher,
    stopGitWatcher
} from './git/watcher';

// 3. Re-export all command functions
export {
    getGitStatus,
    getGitChanges,
    stageFile,
    unstageFile,
    discardChanges,
    commit,
    getBranches,
    checkoutBranch,
    createBranch,
    getCommitHistory,
    getFileDiff,
    getCurrentBranch,
    stashChanges,
    popStash,
    checkoutCommit,
    createBranchFromCommit,
    getCommitDiff,
    initRepo,
} from './git/commands';