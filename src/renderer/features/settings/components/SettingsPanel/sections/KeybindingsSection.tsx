import React from 'react';
import { SectionProps } from '../SettingsRegistry';
import KeybindingInput from '../KeybindingInput';
import { COMMAND_MANIFEST } from "../../../../../../shared/command-manifest";
import { CommandId } from '../../../../../../shared/types';

const KeybindingsSection: React.FC<SectionProps> = ({ settings, onSave }) => {
    return (
        <div className="setting-group">
            <h3>Keyboard Shortcuts</h3>
            <div className="keybindings-list">
                {Object.entries(settings.keymap).map(([commandId, binding]) => {
                    const cmdInfo = COMMAND_MANIFEST[commandId as CommandId];
                    if (!cmdInfo) return null;

                    return (
                        <div key={commandId} className="setting-row keybinding-row">
                            <div className="setting-info">
                                <label>{cmdInfo.label}</label>
                                <span className="setting-desc">{cmdInfo.description || commandId}</span>
                            </div>
                            <div className="setting-control">
                                <KeybindingInput
                                    value={binding}
                                    onChange={(newBinding) => {
                                        onSave('keymap', {
                                            ...settings.keymap,
                                            [commandId]: newBinding
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KeybindingsSection;