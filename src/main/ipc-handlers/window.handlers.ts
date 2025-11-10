// src/main/ipc-handlers/window.handlers.ts
import { IpcMain, dialog } from 'electron';
import { IpcHandlerSharedState } from './state';
import { windowChannels } from '../../shared/constants'; // <-- 关键修改

export const registerWindowHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {

    ipcMain.on(windowChannels.MINIMIZE, () => state.getMainWindow().minimize());

    ipcMain.on(windowChannels.MAXIMIZE, () => {
        const mainWindow = state.getMainWindow();
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on(windowChannels.CLOSE, () => state.getMainWindow().close());

    ipcMain.handle(windowChannels.SHOW_SAVE_DIALOG, async (): Promise<'save' | 'dont-save' | 'cancel'> => {
        const { response } = await dialog.showMessageBox(state.getMainWindow(), {
            type: 'warning',
            buttons: ['保存', '不保存', '取消'],
            title: '退出前确认',
            message: '文件有未保存的更改，您想保存它们吗？',
            defaultId: 0,
            cancelId: 2
        });
        if (response === 0) return 'save';
        if (response === 1) return 'dont-save';
        return 'cancel';
    });

    ipcMain.on(windowChannels.SET_TITLE, (_event, title: string) => {
        // (No-op, as noted in original file)
    });
};