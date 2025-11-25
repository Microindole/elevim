// src/main/lib/settings.ts
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'node:fs/promises';
import {AppSettings, EditorColors, Keymap} from '../../shared/types';
import {DEFAULT_THEME} from "../../shared/themes";

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

const defaultKeymap: Keymap = {
    'app.quit': 'Ctrl+Q',
    'file.new': 'Ctrl+N',
    'file.open': 'Ctrl+O',
    'file.openFolder': 'Ctrl+Shift+O',
    'file.save': 'Ctrl+S',
    'file.saveAs': 'Ctrl+Shift+S',
    'view.togglePalette': 'Ctrl+Shift+P',
    'view.toggleTerminal': 'Ctrl+`',
    'view.toggleGitPanel': 'Ctrl+Shift+G',
    'view.toggleSearchPanel': 'Ctrl+Shift+F',
    'view.splitEditor': 'Ctrl+\\',
    'editor.save': 'Mod+S'
};

const defaultSettings: AppSettings = {
    fontSize: 15,
    keymap: defaultKeymap,
    theme: {
        mode: 'dark',
        colors: DEFAULT_THEME
    },
    customThemes: {} // 初始化为空对象
};

export async function readSettings(): Promise<AppSettings> {
    try {
        await fs.access(settingsPath);
        const settingsData = await fs.readFile(settingsPath, 'utf-8');
        const savedSettings = JSON.parse(settingsData);

        return {
            ...defaultSettings, // 默认值
            ...savedSettings,   // 加载的值
            keymap: {           // 深度合并 keymap
                ...defaultSettings.keymap,
                ...(savedSettings.keymap || {})
            }
        };
    } catch (error) {
        // 如果文件不存在或无法读取，返回默认值
        return defaultSettings;
    }
}

export async function writeSettings(settings: Partial<AppSettings>) {
    try {
        // 写入时也执行合并，而不是完全覆盖
        const currentSettings = await readSettings();
        const newSettings = {
            ...currentSettings,
            ...settings,
            // 如果传入了 keymap，它会覆盖
        };
        await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
    } catch (error) {
        console.error('Failed to write settings:', error);
    }
}