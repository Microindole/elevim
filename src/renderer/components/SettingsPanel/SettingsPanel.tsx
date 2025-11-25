// src/renderer/components/SettingsPanel/SettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import {AppSettings, CommandId, EditorColors} from '../../../shared/types';
import KeybindingInput from './KeybindingInput';
import {PRESET_THEMES} from "../../../shared/themes";

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

    const allThemes = {
        ...PRESET_THEMES,
        ...(settings?.customThemes || {})
    };

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

    // 处理颜色单独修改
    const handleColorChange = (colorKey: keyof EditorColors, newValue: string) => {
        if (!settings) return;
        const newColors = { ...settings.theme.colors, [colorKey]: newValue };
        const newTheme = { ...settings.theme, colors: newColors };
        handleSave('theme', newTheme);
    };

    // 处理导入按钮点击
    const handleImportClick = async () => {
        const result = await window.electronAPI.settings.importTheme();

        if (result.success && result.data && settings) {
            const { name, colors } = result.data;

            // 1. 准备新的 customThemes 数据
            const newCustomThemes = {
                ...(settings.customThemes || {}), // 防止 undefined
                [name]: colors
            };

            // 2. 准备新的当前主题数据
            const newActiveTheme = {
                ...settings.theme,
                colors: colors
            };

            // 3. 【关键修复】基于旧 settings 一次性构建出完整的新状态
            const newSettings = {
                ...settings,
                customThemes: newCustomThemes,
                theme: newActiveTheme
            };

            // 4. 更新本地 React 状态 (UI 会立即刷新，显示下拉列表)
            setSettings(newSettings);

            // 5. 持久化到后端 (分别保存)
            window.electronAPI.settings.setSetting('customThemes', newCustomThemes);
            window.electronAPI.settings.setSetting('theme', newActiveTheme);

            // 6. 触发全局事件，通知编辑器 (Editor/App) 立即变色
            window.dispatchEvent(new CustomEvent('settings-changed', {
                detail: { key: 'theme', value: newActiveTheme }
            }));

            alert(`Theme "${name}" imported successfully!`);
        } else if (result.message) {
            alert(`Import failed: ${result.message}`);
        }
    };

    // 处理预设切换
    const handlePresetChange = (themeName: string) => {
        if (!settings || !allThemes[themeName]) return;
        const newTheme = { ...settings.theme, colors: allThemes[themeName] };
        handleSave('theme', newTheme);
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

    const handleOpenSettingsFolder = () => {
        window.electronAPI.settings.openSettingsFolder();
    };

    return (
        <div className="settings-page">
            <div className="settings-container">
                <div className="settings-header">
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px'}}>
                        <h1 style={{margin: 0}}>User Settings</h1>

                        <button
                            className="settings-header-btn"
                            onClick={handleOpenSettingsFolder}
                            title="Open settings.json folder"
                        >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
                                 style={{marginRight: '6px'}}>
                                <path
                                    d="M1.5 2.5A1.5 1.5 0 0 1 3 1h4.5l1.5 1.5h5.5A1.5 1.5 0 0 1 16 4v9.5A1.5 1.5 0 0 1 14.5 15h-13A1.5 1.5 0 0 1 0 13.5v-11zM3 2a.5.5 0 0 0-.5.5v.5h11v-.5a.5.5 0 0 0-.5-.5h-5.12L6.38 1.38A.5.5 0 0 0 6 1.5H3zm-1.5 2v9.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V4H1.5z"/>
                            </svg>
                            Open Folder
                        </button>
                    </div>
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

                {/* 主题设置区域 */}
                <div className="settings-section">
                    <h2>Editor Theme</h2>

                    <div className="setting-row">
                        <div className="setting-info">
                            <label>Theme Preset</label>
                            <span className="setting-desc">Select from presets or imported themes.</span>
                        </div>
                        <div className="setting-control" style={{display: 'flex', gap: '10px'}}>
                            <select
                                className="settings-select"
                                onChange={(e) => handlePresetChange(e.target.value)}
                                value={Object.keys(allThemes).find(key =>
                                    JSON.stringify(allThemes[key]) === JSON.stringify(settings?.theme.colors)
                                ) || ""}
                            >
                                <option value="" disabled>Custom / Select...</option>

                                <optgroup label="Presets">
                                    {Object.keys(PRESET_THEMES).map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </optgroup>

                                {/* 渲染用户自定义主题 */}
                                {settings?.customThemes && Object.keys(settings.customThemes).length > 0 && (
                                    <optgroup label="Imported">
                                        {Object.keys(settings.customThemes).map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>

                            {/* 导入按钮 */}
                            <button
                                className="git-action-btn secondary" // 复用现有按钮样式
                                onClick={handleImportClick}
                                title="Import JSON Theme"
                                style={{height: '35px', padding: '0 15px'}}
                            >
                                Import...
                            </button>
                        </div>
                    </div>

                    {/* 颜色微调列表 */}
                    {settings && (
                        <div className="colors-grid"
                             style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px'}}>
                            {Object.entries(settings.theme.colors).map(([key, value]) => (
                                <div key={key} className="setting-row"
                                     style={{borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '5px 0'}}>
                                    <div className="setting-info">
                                        <label style={{fontSize: '12px'}}>{key}</label>
                                    </div>
                                    <div className="setting-control"
                                         style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <input
                                            type="color"
                                            value={value as string}
                                            onChange={(e) => handleColorChange(key as keyof EditorColors, e.target.value)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                width: '30px',
                                                height: '30px',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <span style={{
                                            fontSize: '12px',
                                            fontFamily: 'monospace',
                                            color: '#888'
                                        }}>{value as string}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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