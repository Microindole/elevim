// src/main/ipc-handlers/settings.handlers.ts
import { IpcMain } from 'electron';
import { readSettings, writeSettings } from '../lib/settings';
import { AppSettings } from '../../shared/types';
import { IpcHandlerSharedState } from './state';

export const settingsChannels = {
    GET_SETTINGS: 'settings:get',
    SET_SETTING: 'settings:set',
};

export const registerSettingsHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain
) => {

    ipcMain.handle(settingsChannels.GET_SETTINGS, async () => {
        return await readSettings();
    });

    ipcMain.on(settingsChannels.SET_SETTING, async (_event, key: keyof AppSettings, value: any) => {
        await writeSettings({ [key]: value });
    });
};