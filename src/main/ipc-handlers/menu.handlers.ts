// src/main/ipc-handlers/menu.handlers.ts
import { IpcMain } from 'electron';
import { IpcHandlerSharedState } from './state';

export const menuChannels = {
    NEW_FILE: 'menu:new-file',
    TRIGGER_SAVE_AS_FILE: 'menu:trigger-save-as',
    TRIGGER_SAVE_FILE: 'menu:trigger-save',
};

export const registerMenuHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {

    ipcMain.on(menuChannels.NEW_FILE, () => {
        state.setFile(null);
        state.getMainWindow().webContents.send('new-file'); // <-- 使用保留的事件
    });

    ipcMain.on(menuChannels.TRIGGER_SAVE_AS_FILE, () => {
        state.setFile(null);
        state.getMainWindow().webContents.send('trigger-save-file'); // <-- 使用保留的事件
    });

    ipcMain.on(menuChannels.TRIGGER_SAVE_FILE, () => {
        state.getMainWindow().webContents.send('trigger-save-file'); // <-- 使用保留的事件
    });
};