// src/main/ipc-handlers/menu.handlers.ts
import { IpcMain } from 'electron';
import { IpcHandlerSharedState } from './state';
import { menuChannels, IPC_CHANNELS } from '../../shared/constants'; // <-- 关键修改

export const registerMenuHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {

    ipcMain.on(menuChannels.NEW_FILE, () => {
        state.setFile(null);
        state.getMainWindow().webContents.send(IPC_CHANNELS.NEW_FILE); // <-- 使用保留的事件
    });

    ipcMain.on(menuChannels.TRIGGER_SAVE_AS_FILE, () => {
        state.setFile(null);
        state.getMainWindow().webContents.send(IPC_CHANNELS.TRIGGER_SAVE_FILE); // <-- 使用保留的事件
    });

    ipcMain.on(menuChannels.TRIGGER_SAVE_FILE, () => {
        state.getMainWindow().webContents.send(IPC_CHANNELS.TRIGGER_SAVE_FILE); // <-- 使用保留的事件
    });
};