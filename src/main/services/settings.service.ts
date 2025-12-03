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
        await writeSettings({ [key]: value });
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