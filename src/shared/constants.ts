
export const IPC_CHANNELS = {
    ESLINT_LINT: 'eslint-lint',

    // 文件操作

    FILE_SAVED: 'file-saved',
    SHOW_OPEN_DIALOG: 'show-open-dialog',
    SAVE_FILE: 'save-file',
    FILE_OPENED: 'file-opened',
    NEW_FILE: 'new-file',
    OPEN_FOLDER: 'open-folder',
    OPEN_FILE: 'open-file',
    READ_DIRECTORY: 'read-directory',


    // Git
    GET_GIT_STATUS: 'get-git-status',

    // 窗口控制
    WINDOW_MINIMIZE: 'window-minimize',
    WINDOW_MAXIMIZE: 'window-maximize',
    WINDOW_CLOSE: 'window-close',

    // 对话框
    SHOW_SAVE_DIALOG: 'show-save-dialog',

    // 设置
    GET_SETTING: 'get-setting',
    SET_SETTING: 'set-setting',
    SET_TITLE: 'set-title',

    // 终端
    TERMINAL_INIT: 'terminal:init',
    TERMINAL_IN: 'terminal:in',
    TERMINAL_OUT: 'terminal:out',
    TERMINAL_RESIZE: 'terminal:resize',
};