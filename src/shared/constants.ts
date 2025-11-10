// src/shared/constants.ts

/**
 * 仅包含从主进程推送到渲染进程的事件通道。
 * 所有 Renderer -> Main 的请求/调用通道都已移至
 * 它们各自的 `src/main/ipc-handlers/*.handlers.ts` 文件中。
 */
export const IPC_CHANNELS = {
    // --- 文件 & 文件夹事件 ---
    FILE_OPENED: 'file-opened',
    FILE_SAVED: 'file-saved', // (这个好像没在用，但保留)
    NEW_FILE: 'new-file', // (这个是 Menu -> Main -> Renderer 事件)

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