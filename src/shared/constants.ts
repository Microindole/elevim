// src/shared/constants.ts
/**
 * 包含所有 IPC 通道。
 * 1. 主进程 -> 渲染进程的 (推送事件)
 * 2. 渲染进程 -> 主进程的 (调用/请求)
 */

// --- 1. Main -> Renderer 事件 (推送事件) ---
export const IPC_CHANNELS = {
    // --- 文件 & 文件夹事件 ---
    FILE_OPENED: 'file-opened',
    FILE_SAVED: 'file-saved',
    NEW_FILE: 'new-file',

    // --- 菜单/快捷键触发 (渲染进程监听) ---
    TRIGGER_SAVE_FILE: 'trigger-save-file',

    // --- 终端事件 ---
    TERMINAL_OUT: 'terminal-out',

    // --- Git 事件 ---
    GIT_STATUS_CHANGE: 'git-status-change',

    // --- 命令行 (CLI) 启动事件 ---
    OPEN_FOLDER_FROM_CLI: 'open-folder-from-cli',
    OPEN_FILE_FROM_CLI: 'open-file-from-cli',
    OPEN_DIFF_FROM_CLI: 'open-diff-from-cli',
};

// --- GitHub Events (Main -> Renderer) ---
export const GITHUB_EVENTS = {
    PUBLISH_SUCCESS: 'github:publish-success'
};

// --- 2. Renderer -> Main 调用 (请求/调用) ---

export const fileChannels = {
    SHOW_OPEN_DIALOG: 'file:show-open-dialog',
    SAVE_FILE: 'file:save-file',
    OPEN_FOLDER: 'file:open-folder',
    OPEN_FILE: 'file:open-file',
    READ_DIRECTORY: 'file:read-directory',
    GLOBAL_SEARCH: 'file:global-search',
    GLOBAL_REPLACE: 'file:global-replace',
    READ_DIRECTORY_FLAT: 'file:read-directory-flat',
};

export const gitChannels = {
    START_GIT_WATCHER: 'git:start-watcher',
    STOP_GIT_WATCHER: 'git:stop-watcher',
    GET_GIT_STATUS: 'git:get-status',
    GET_CHANGES: 'git:get-changes',
    STAGE_FILE: 'git:stage-file',
    UNSTAGE_FILE: 'git:unstage-file',
    DISCARD_CHANGES: 'git:discard-changes',
    COMMIT: 'git:commit',
    GET_BRANCHES: 'git:get-branches',
    CHECKOUT_BRANCH: 'git:checkout-branch',
    CREATE_BRANCH: 'git:create-branch',
    GET_COMMITS: 'git:get-commits',
    GET_DIFF: 'git:get-diff',
    GET_CURRENT_BRANCH: 'git:get-current-branch',
    STASH: 'git:stash',
    STASH_POP: 'git:stash-pop',
    CHECKOUT_COMMIT: 'git:checkout-commit',
    CREATE_BRANCH_FROM_COMMIT: 'git:create-branch-from-commit',
    OPEN_COMMIT_DIFF: 'git:open-commit-diff',
    INIT_REPO: 'git:init-repo',
    GET_REMOTES:'git:get-remotes'
};

export const githubChannels = {
    START_AUTH: 'github:start-auth',
    PUBLISH_REPO: 'github:publish-repo',
    GET_TOKEN_STATUS: 'github:get-token-status',
    LIST_REPOS: 'github:list-repos',
    LINK_REMOTE: 'github:link-remote'
};

export const menuChannels = {
    NEW_FILE: 'menu:new-file',
    TRIGGER_SAVE_AS_FILE: 'menu:trigger-save-as',
    TRIGGER_SAVE_FILE: 'menu:trigger-save',
};

export const settingsChannels = {
    GET_SETTINGS: 'settings:get',
    SET_SETTING: 'settings:set',
    IMPORT_THEME: 'settings:import-theme',
    OPEN_SETTINGS_FOLDER: 'settings:open-folder',
};

export const terminalChannels = {
    INIT: 'terminal:init',
    IN: 'terminal:in',
    RESIZE: 'terminal:resize',
};

export const windowChannels = {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    SHOW_SAVE_DIALOG: 'window:show-save-dialog',
    SET_TITLE: 'window:set-title',
    SHOW_MESSAGE_BOX: 'window:show-message-box',
    SHOW_CONFIRM_BOX: 'window:show-confirm-box'
};

export const sessionChannels = {
    GET_SESSION: 'session:get',
    SAVE_SESSION: 'session:save'
};