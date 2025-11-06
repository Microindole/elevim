// src/renderer/components/SettingsPanel/SettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import { AppSettings, CommandId } from '../../../shared/types';
import KeybindingInput from './KeybindingInput';

// 帮助文本，让 UI 更友好
const commandLabels: Record<CommandId, string> = {
    'app.quit': '退出应用',
    'file.new': '新建文件',
    'file.open': '打开文件',
    'file.openFolder': '打开文件夹',
    'file.save': '保存',
    'file.saveAs': '另存为',
    'view.togglePalette': '切换命令面板',
    'view.toggleTerminal': '切换终端',
    'view.toggleGitPanel': '切换 Git 面板',
    'view.toggleSearchPanel': '切换搜索面板',
    'editor.save': '保存 (编辑器)',
};

export default function SettingsPanel() {
    const [settings, setSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const loadedSettings = await window.electronAPI.getSettings();
            setSettings(loadedSettings);
        };
        fetchSettings();
    }, []);

    // --- 统一的保存逻辑 ---
    const handleSave = (key: keyof AppSettings, value: any) => {
        // 1. 更新本地 state
        const newSettings = { ...settings!, [key]: value };
        setSettings(newSettings);

        // 2. 保存到主进程
        window.electronAPI.setSetting(key, value);

        // 3. 广播事件
        window.dispatchEvent(new CustomEvent('settings-changed', {
            detail: { key, value }
        }));
    };

    const handleKeymapChange = (command: CommandId, newShortcut: string) => {
        const newKeymap = { ...settings!.keymap, [command]: newShortcut };
        handleSave('keymap', newKeymap);
    };

    const handleFontSizeChange = (newSize: number) => {
        handleSave('fontSize', newSize);
    };

    if (!settings) {
        return <div className="settings-panel">Loading...</div>;
    }

    return (
        <div className="settings-panel">
            <div className="settings-header">
                <h3>设置</h3>
            </div>
            <div className="settings-content">
                {/* 1. 字体大小 */}
                <div className="settings-group">
                    <h4>编辑器</h4>
                    <div className="settings-item">
                        <label htmlFor="font-size">字体大小</label>
                        <input
                            type="number"
                            id="font-size"
                            className="settings-input"
                            value={settings.fontSize}
                            onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
                        />
                    </div>
                </div>

                {/* 2. 快捷键 */}
                <div className="settings-group">
                    <h4>快捷键</h4>
                    {Object.keys(settings.keymap).map((command) => (
                        <div className="settings-item" key={command}>
                            <label htmlFor={command}>
                                {commandLabels[command as CommandId] || command}
                            </label>
                            <KeybindingInput
                                value={settings.keymap[command as CommandId]}
                                onChange={(newShortcut) => handleKeymapChange(command as CommandId, newShortcut)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}