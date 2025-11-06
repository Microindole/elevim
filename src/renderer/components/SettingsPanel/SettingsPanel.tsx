// src/renderer/components/SettingsPanel/SettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';

// 定义我们目前支持的设置
interface AppSettings {
    fontSize: number;
}

export default function SettingsPanel() {
    const [settings, setSettings] = useState<AppSettings | null>(null);

    // 1. 组件加载时，从主进程获取当前设置
    useEffect(() => {
        const fetchSettings = async () => {
            // 我们一次性获取所有设置（虽然现在只有一个）
            const fontSize = await window.electronAPI.getSetting('fontSize') || 15;
            setSettings({ fontSize });
        };
        fetchSettings();
    }, []);

    // 2. 处理设置变更
    const handleSettingChange = (key: keyof AppSettings, value: any) => {
        if (!settings) return;

        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        // 3. 将新设置保存到主进程的 settings.json
        window.electronAPI.setSetting(key, value);

        // 4. 广播一个全局事件，通知所有组件（比如 Editor）设置已变更
        window.dispatchEvent(new CustomEvent('settings-changed', {
            detail: { key, value }
        }));
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
                <div className="settings-group">
                    <h4>编辑器</h4>
                    <div className="settings-item">
                        <label htmlFor="font-size">字体大小</label>
                        <input
                            type="number"
                            id="font-size"
                            className="settings-input"
                            value={settings.fontSize}
                            onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value, 10))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}