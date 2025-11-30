// src/main/lib/settings.ts
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'node:fs/promises';
import { AppSettings, Keymap } from '../../shared/types';
import { DEFAULT_THEME } from "../../shared/themes";
import { generateDefaultKeymap } from "../../shared/command-manifest";

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// 使用 helper 生成默认键位，不再手动写死
const defaultKeymap: Keymap = generateDefaultKeymap() as Keymap;

const defaultSettings: AppSettings = {
    fontSize: 15,
    keymap: defaultKeymap,
    theme: {
        mode: 'dark',
        colors: DEFAULT_THEME
    },
    customThemes: {},
    zenMode: {
        fullScreen: true,
        centerLayout: true,
        hideLineNumbers: false,
        typewriterScroll: true,
    }
};

export async function readSettings(): Promise<AppSettings> {
    try {
        await fs.access(settingsPath);
        const settingsData = await fs.readFile(settingsPath, 'utf-8');
        const savedSettings = JSON.parse(settingsData);

        return {
            ...defaultSettings,
            ...savedSettings,
            keymap: {
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