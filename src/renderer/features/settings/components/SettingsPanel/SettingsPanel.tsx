import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import { AppSettings } from '../../../../../shared/types';
import { SETTINGS_SECTIONS, SettingSectionConfig } from './SettingsRegistry';

export default function SettingsPanel() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [activeTabId, setActiveTabId] = useState<string>('general');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            const loadedSettings = await window.electronAPI.settings.getSettings();
            setSettings(loadedSettings);
        };
        fetchSettings();
    }, []);

    // 统一的保存处理逻辑
    const handleSave = (key: keyof AppSettings, value: any) => {
        if (!settings) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        window.electronAPI.settings.setSetting(key, value);
        window.dispatchEvent(new CustomEvent('settings-changed', {
            detail: { key, value }
        }));
    };

    if (!settings) return <div className="settings-loading">Loading configuration...</div>;

    // 根据 ID 找到当前活动的组件
    const activeSection = SETTINGS_SECTIONS.find(s => s.id === activeTabId) || SETTINGS_SECTIONS[0];
    const ActiveComponent = activeSection.Component;

    // 简单的搜索过滤：如果 searchTerm 存在，高亮匹配的 Tab (可选增强)
    // 这里我们简单实现：如果搜索词匹配了某个 Tab 的 Label，就显示它
    // 或者你可以把 searchTerm 传递给 ActiveComponent 让它在内部高亮

    return (
        <div className="settings-panel">
            {/* 1. Sidebar - 动态生成 */}
            <div className="settings-sidebar">
                <div className="settings-header">
                    <h2>Settings</h2>
                </div>
                <div className="settings-search">
                    <input
                        type="text"
                        placeholder="Search settings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <nav className="settings-nav">
                    {SETTINGS_SECTIONS.map((section: SettingSectionConfig) => (
                        <div
                            key={section.id}
                            className={`settings-nav-item ${activeTabId === section.id ? 'active' : ''}`}
                            onClick={() => setActiveTabId(section.id)}
                        >
                            <span className={`codicon codicon-${section.icon}`}></span>
                            {section.label}
                        </div>
                    ))}
                </nav>
            </div>

            {/* 2. Content - 动态渲染 */}
            <div className="settings-content">
                <div className="settings-content-header">
                    <h2>{activeSection.label}</h2>
                </div>
                <div className="settings-scroll-area">
                    {/* 工厂模式的核心：动态组件渲染 */}
                    <ActiveComponent
                        settings={settings}
                        onSave={handleSave}
                        searchTerm={searchTerm}
                    />
                </div>
            </div>
        </div>
    );
}