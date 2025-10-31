
export const IPC_CHANNELS = {
    FILE_OPENED: 'file-opened',      // 主 -> 渲
    SAVE_FILE: 'save-file',          // 渲 -> 主
    SET_TITLE: 'set-title',          // 渲 -> 主，请求设置标题
    WINDOW_MINIMIZE: 'window-minimize',
    WINDOW_MAXIMIZE: 'window-maximize',
    WINDOW_CLOSE: 'window-close',
    SHOW_OPEN_DIALOG: 'show-open-dialog',
    NEW_FILE: 'new-file',            // 主 -> 渲，通知新建文件
    FILE_SAVED: 'file-saved',        // 主 -> 渲
    SHOW_SAVE_DIALOG: 'show-save-dialog', // 渲 -> 主，请求显示保存对话框
    OPEN_FOLDER: 'open-folder',
    OPEN_FILE: 'open-file',
    GET_SETTING: 'get-setting', // 获取设置
    SET_SETTING: 'set-setting', // 保存设置
    TERMINAL_INIT: 'terminal-init',     // 渲 -> 主：请求启动 pty
    TERMINAL_IN: 'terminal-in',       // 渲 -> 主：从 xterm.js 发送数据 (用户输入)
    TERMINAL_OUT: 'terminal-out',     // 主 -> 渲：从 pty 发送数据 (Shell 输出)
    TERMINAL_RESIZE: 'terminal-resize',  // 渲 -> 主：通知调整 pty 大小
    GET_GIT_STATUS: 'get-git-status',    // 渲 -> 主：请求 Git 状态
    READ_DIRECTORY: 'read-directory',
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
};