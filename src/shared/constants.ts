// src/shared/constants.ts
export const IPC_CHANNELS = {
    FILE_OPENED: 'file-opened',      // 主 -> 渲
    SAVE_FILE: 'save-file',          // 渲 -> 主
    FILE_SAVED: 'file-saved'         // 主 -> 渲 (可选，用于通知保存成功)
};