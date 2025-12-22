import React from 'react';
import { SectionProps } from '../SettingsRegistry';

const EditorSection: React.FC<SectionProps> = ({ settings, onSave }) => {
    return (
        <div className="setting-group">
            <h3>Zen Mode</h3>
            <div className="setting-row">
                <div className="setting-info">
                    <label>Full Screen</label>
                    <span className="setting-desc">
                        Go to full screen when entering Zen Mode.
                    </span>
                </div>
                <div className="setting-control">
                    <input
                        type="checkbox"
                        checked={settings.zenMode?.fullScreen ?? true}
                        onChange={(e) => onSave('zenMode', {
                            ...settings.zenMode,
                            fullScreen: e.target.checked
                        })}
                    />
                </div>
            </div>

            <div className="setting-row">
                <div className="setting-info">
                    <label>Center Layout</label>
                    <span className="setting-desc">
                        Center the editor layout in Zen Mode.
                    </span>
                </div>
                <div className="setting-control">
                    <input
                        type="checkbox"
                        checked={settings.zenMode?.centerLayout ?? true}
                        onChange={(e) => onSave('zenMode', {
                            ...settings.zenMode,
                            centerLayout: e.target.checked
                        })}
                    />
                </div>
            </div>

            <div className="setting-row">
                <div className="setting-info">
                    <label>Hide Line Numbers</label>
                    <span className="setting-desc">
                        Hide line numbers in Zen Mode.
                    </span>
                </div>
                <div className="setting-control">
                    <input
                        type="checkbox"
                        checked={settings.zenMode?.hideLineNumbers ?? false}
                        onChange={(e) => onSave('zenMode', {
                            ...settings.zenMode,
                            hideLineNumbers: e.target.checked
                        })}
                    />
                </div>
            </div>

            {/* Typewriter Scroll */}
            <div className="setting-row">
                <div className="setting-info">
                    <label>Typewriter Scroll</label>
                    <span className="setting-desc">
                         Keep the cursor vertically centered.
                    </span>
                </div>
                <div className="setting-control">
                    <input
                        type="checkbox"
                        checked={settings.zenMode?.typewriterScroll ?? true}
                        onChange={(e) => onSave('zenMode', {
                            ...settings.zenMode,
                            typewriterScroll: e.target.checked
                        })}
                    />
                </div>
            </div>

            {/* Focus Mode */}
            <div className="setting-row">
                <div className="setting-info">
                    <label>Focus Mode</label>
                    <span className="setting-desc">
                        Dim all lines except the current one.
                    </span>
                </div>
                <div className="setting-control">
                    <input
                        type="checkbox"
                        checked={settings.zenMode?.focusMode ?? false}
                        onChange={(e) => onSave('zenMode', {
                            ...settings.zenMode,
                            focusMode: e.target.checked
                        })}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditorSection;