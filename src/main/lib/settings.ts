// src/main/lib/settings.ts
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'node:fs/promises';

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

export async function readSettings() {
    try {
        await fs.access(settingsPath);
        const settingsData = await fs.readFile(settingsPath, 'utf-8');
        return JSON.parse(settingsData);
    } catch (error) {
        // 如果文件不存在或无法读取，返回默认值
        return { fontSize: 14 };
    }
}

export async function writeSettings(settings: any) {
    try {
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Failed to write settings:', error);
    }
}