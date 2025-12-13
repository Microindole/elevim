import { dialog, BrowserWindow, shell, app } from 'electron';
import * as fs from 'fs/promises';
import { ISettingsService } from '../../shared/api-contract';
import { AppSettings, EditorColors } from '../../shared/types';
import { readSettings, writeSettings } from '../lib/settings';

export class SettingsService implements ISettingsService {
    constructor(private mainWindow: BrowserWindow) {}

    async getSettings(): Promise<AppSettings> {
        return await readSettings();
    }

    async setSetting(key: string, value: any): Promise<void> {
        const oldSettings = await readSettings();

        // 写入新设置
        await writeSettings({ [key]: value });

        // 检测是否修改了模式
        if (key === 'mode' && value !== oldSettings.mode) {
            const { response } = await dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: '切换模式',
                message: `正在切换到 ${value === 'writer' ? '写作模式' : '代码模式'}，应用将自动重启。`,
                buttons: ['确定']
            });

            // 重启应用
            app.relaunch();
            app.exit(0);
        }
    }

    async importTheme(): Promise<{ success: boolean, data?: { name: string, colors: any }, message?: string }> {
        const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow, {
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
            const requiredKeys: (keyof EditorColors)[] = ['background', 'foreground', 'keyword', 'variable'];
            const targetColors = parsed.colors || parsed;

            for (const key of requiredKeys) {
                if (!targetColors[key]) throw new Error(`Missing '${key}'`);
            }

            let themeName = parsed.name;
            if (!themeName) {
                const path = require('path');
                themeName = path.basename(filePaths[0], '.json');
            }

            return { success: true, data: { name: themeName, colors: targetColors } };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }

    async openSettingsFolder(): Promise<boolean> {
        const userDataPath = app.getPath('userData');
        await shell.openPath(userDataPath);
        return true;
    }
}