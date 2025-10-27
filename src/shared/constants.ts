
export const IPC_CHANNELS = {
    FILE_OPENED: 'file-opened',      // 主 -> 渲
    SAVE_FILE: 'save-file',          // 渲 -> 主
    SET_TITLE: 'set-title',          // 渲 -> 主，请求设置标题
    WINDOW_MINIMIZE: 'window-minimize',
    WINDOW_MAXIMIZE: 'window-maximize',
    WINDOW_CLOSE: 'window-close',
    SHOW_OPEN_DIALOG: 'show-open-dialog',
    NEW_FILE: 'new-file',            // 主 -> 渲，通知新建文件
    FILE_SAVED: 'file-saved'         // 主 -> 渲
};