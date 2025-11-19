// src/renderer/components/SettingsPanel/SettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import { AppSettings, CommandId } from '../../../shared/types';
import KeybindingInput from './KeybindingInput';

const commandLabels: Record<CommandId, string> = {
    'app.quit': '退出应用',
    'file.new': '新建文件',
    'file.open': '打开文件',
    'file.openFolder': '打开文件夹',
    'file.save': '保存文件',
    'file.saveAs': '另存为...',
    'view.togglePalette': '显示命令面板',
    'view.toggleTerminal': '切换集成终端',
    'view.toggleGitPanel': '切换源代码管理',
    'view.toggleSearchPanel': '切换搜索面板',
    'view.splitEditor': '拆分编辑器',
    'editor.save': '保存 (编辑器内部快捷键)',
};

export default function SettingsPanel() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            const loadedSettings = await window.electronAPI.settings.getSettings();
            setSettings(loadedSettings);
        };
        fetchSettings();
    }, []);

    const handleSave = (key: keyof AppSettings, value: any) => {
        const newSettings = { ...settings!, [key]: value };
        setSettings(newSettings);
        window.electronAPI.settings.setSetting(key, value);
        window.dispatchEvent(new CustomEvent('settings-changed', {
            detail: { key, value }
        }));
    };

    const handleKeymapChange = (command: CommandId, newShortcut: string) => {
        const newKeymap = { ...settings!.keymap, [command]: newShortcut };
        handleSave('keymap', newKeymap);
    };

    if (!settings) return <div className="settings-loading">Loading Settings...</div>;

    // 简单的搜索过滤
    const filteredCommands = Object.keys(settings.keymap).filter(cmd =>
        cmd.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (commandLabels[cmd as CommandId] || '').toLowerCase().includes(searchTerm.toLowerCase())
    ) as CommandId[];

    return (
        <div className="settings-page">
            <div className="settings-container">
                <div className="settings-header">
                    <h1>User Settings</h1>
                    <div className="settings-search-wrapper">
                        <input
                            type="text"
                            placeholder="Search settings..."
                            className="settings-search-bar"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="settings-section">
                    <h2>Editor</h2>
                    <div className="setting-row">
                        <div className="setting-info">
                            <label>Font Size</label>
                            <span className="setting-desc">Controls the font size in pixels.</span>
                        </div>
                        <div className="setting-control">
                            <input
                                type="number"
                                className="settings-number-input"
                                value={settings.fontSize}
                                onChange={(e) => handleSave('fontSize', parseInt(e.target.value, 10))}
                            />
                        </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h2>Keyboard Shortcuts</h2>
                    <div className="shortcuts-list">
                        {filteredCommands.map((command) => (
                            <div className="setting-row shortcut-row" key={command}>
                                <div className="setting-info">
                                    <label>{commandLabels[command] || command}</label>
                                    <span className="setting-code">{command}</span>
                                </div>
                                <div className="setting-control">
                                    <KeybindingInput
                                        value={settings.keymap[command]}
                                        onChange={(newShortcut) => handleKeymapChange(command, newShortcut)}
                                    />
                                </div>
                            </div>
                        ))}
                        {filteredCommands.length === 0 && (
                            <div className="settings-empty">No matching settings found</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}