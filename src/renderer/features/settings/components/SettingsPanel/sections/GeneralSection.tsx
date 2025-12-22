import React from 'react';
import { SectionProps } from '../SettingsRegistry';

const GeneralSection: React.FC<SectionProps> = ({ settings, onSave }) => {
    return (
        <div className="setting-group">
            <h3>Font</h3>
            <div className="setting-row">
                <div className="setting-info">
                    <label>Font Size</label>
                    <span className="setting-desc">Controls the font size in pixels.</span>
                </div>
                <div className="setting-control">
                    <input
                        type="number"
                        value={settings.fontSize}
                        onChange={(e) => onSave('fontSize', parseInt(e.target.value))}
                        min="8"
                        max="32"
                    />
                </div>
            </div>

            <div className="setting-row">
                <div className="setting-info">
                    <label>Font Family</label>
                    <span className="setting-desc">Controls the font family.</span>
                </div>
                <div className="setting-control">
                    <select disabled title="Comming Soon">
                        <option>JetBrains Mono</option>
                        <option>Fira Code</option>
                        <option>Consolas</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default GeneralSection;