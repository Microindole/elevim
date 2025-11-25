// src/main/ipc-handlers/settings.handlers.ts
import { IpcMain, dialog, shell } from 'electron';
import * as fs from 'node:fs/promises';
import { readSettings, writeSettings } from '../lib/settings';
import {AppSettings, EditorColors} from '../../shared/types';
import { IpcHandlerSharedState } from './state';
import { settingsChannels } from '../../shared/constants';

export const registerSettingsHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {

    ipcMain.handle(settingsChannels.GET_SETTINGS, async () => {
        return await readSettings();
    });

    ipcMain.on(settingsChannels.SET_SETTING, async (_event, key: keyof AppSettings, value: any) => {
        await writeSettings({ [key]: value });
    });

    ipcMain.handle(settingsChannels.IMPORT_THEME, async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(state.getMainWindow(), {
            title: 'Import Theme',
            filters: [{ name: 'JSON Theme', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (canceled || filePaths.length === 0) {
            return { success: false, message: 'User cancelled' };
        }

        try {
            const content = await fs.readFile(filePaths[0], 'utf-8');
            const parsed = JSON.parse(content);

            // 简单的校验：检查是否有关键字段
            // 这里假设 JSON 结构是 { "name": "MyTheme", "colors": { ... } } 或者直接是 colors 对象
            // 为了简单起见，我们强制要求 JSON 包含完整的 EditorColors 字段
            const requiredKeys: (keyof EditorColors)[] = ['background', 'foreground', 'keyword', 'variable'];
            const targetColors = parsed.colors || parsed; // 兼容两种格式

            for (const key of requiredKeys) {
                if (!targetColors[key]) {
                    throw new Error(`Invalid theme file: missing '${key}'`);
                }
            }

            // 提取主题名称（优先用文件里的 name，否则用文件名）
            let themeName = parsed.name;
            if (!themeName) {
                const path = require('path');
                themeName = path.basename(filePaths[0], '.json');
            }

            return {
                success: true,
                data: { name: themeName, colors: targetColors }
            };

        } catch (e: any) {
            console.error('Failed to import theme:', e);
            return { success: false, message: e.message };
        }
    });

    // 打开设置文件夹
    ipcMain.handle(settingsChannels.OPEN_SETTINGS_FOLDER, async () => {
        try {
            // 获取用户数据目录 (例如: %APPDATA%/elevim 或 ~/.config/elevim)
            const userDataPath = state.getApp().getPath('userData');

            // 打开文件夹
            await shell.openPath(userDataPath);
            return true;
        } catch (e) {
            console.error('[Settings] Failed to open folder:', e);
            return false;
        }
    });
};