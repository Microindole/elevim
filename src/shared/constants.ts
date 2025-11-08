// src/shared/constants.ts

export const IPC_CHANNELS = {
    // --- 文件 & 文件夹操作 ---
    FILE_OPENED: 'file-opened',
    SAVE_FILE: 'save-file',
    FILE_SAVED: 'file-saved',
    NEW_FILE: 'new-file',
    OPEN_FILE: 'open-file',
    OPEN_FOLDER: 'open-folder',
    READ_DIRECTORY: 'read-directory',
    SHOW_OPEN_DIALOG: 'show-open-dialog',
    SHOW_SAVE_DIALOG: 'show-save-dialog',

    // --- 菜单/快捷键触发 (渲染进程监听) ---
    TRIGGER_SAVE_FILE: 'trigger-save-file',
    TRIGGER_SAVE_AS_FILE: 'trigger-save-as-file',

    // --- 窗口控制 ---
    SET_TITLE: 'set-title',
    WINDOW_MINIMIZE: 'window-minimize',
    WINDOW_MAXIMIZE: 'window-maximize',
    WINDOW_CLOSE: 'window-close',

    // --- 设置 ---
    GET_SETTINGS: 'get-settings',
    SET_SETTING: 'set-setting',

    // --- 终端 ---
    TERMINAL_INIT: 'terminal-init',
    TERMINAL_IN: 'terminal-in',
    TERMINAL_OUT: 'terminal-out',
    TERMINAL_RESIZE: 'terminal-resize',

    // --- Git ---
    GET_GIT_STATUS: 'get-git-status',
    START_GIT_WATCHER: 'start-git-watcher',
    STOP_GIT_WATCHER: 'stop-git-watcher',
    GIT_STATUS_CHANGE: 'git-status-change',
    GIT_GET_CHANGES: 'git-get-changes',
    GIT_STAGE_FILE: 'git-stage-file',
    GIT_UNSTAGE_FILE: 'git-unstage-file',
    GIT_DISCARD_CHANGES: 'git-discard-changes',
    GIT_COMMIT: 'git-commit',
    GIT_GET_BRANCHES: 'git-get-branches',
    GIT_CHECKOUT_BRANCH: 'git-checkout-branch',
    GIT_CREATE_BRANCH: 'git-create-branch',
    GIT_GET_COMMITS: 'git-get-commits',
    GIT_GET_DIFF: 'git-get-diff',
    GIT_GET_CURRENT_BRANCH: 'git-get-current-branch',
    GIT_STASH: 'git-stash',
    GIT_STASH_POP: 'git-stash-pop',
    GIT_CHECKOUT_COMMIT: 'git-checkout-commit',
    GIT_CREATE_BRANCH_FROM_COMMIT: 'git-create-branch-from-commit',
    GIT_OPEN_COMMIT_DIFF: 'git-open-commit-diff',

    // --- 搜索 & 替换 ---
    GLOBAL_SEARCH: 'global-search',
    GLOBAL_REPLACE: 'global-replace',

    // --- 命令行 (CLI) 启动 ---
    OPEN_FOLDER_FROM_CLI: 'open-folder-from-cli',
    OPEN_FILE_FROM_CLI: 'open-file-from-cli',
    OPEN_DIFF_FROM_CLI: 'open-diff-from-cli',
};