import React from 'react';
import { SectionProps } from '../SettingsRegistry';

const AboutSection: React.FC<SectionProps> = () => {
    // ✅ 修复：从 window.electronAPI 获取版本
    const { versions } = window.electronAPI;

    return (
        <div className="setting-group">
            <h3>About Elevim</h3>
            <div className="about-content">
                <p>Elevim is a lightweight, modern code editor.</p>
                <p>Version: 0.4.0-beta</p>
                <div className="version-info" style={{ marginTop: '12px', fontSize: '12px', opacity: 0.8 }}>
                    <p>Electron: {versions.electron}</p>
                    <p>Chrome: {versions.chrome}</p>
                    <p>Node: {versions.node}</p>
                </div>
            </div>
        </div>
    );
};

export default AboutSection;