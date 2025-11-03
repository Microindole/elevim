// src/renderer/components/TitleBar/TitleBar.tsx
import React from 'react';
import './TitleBar.css';

const defaultTitle = "Elevim";

interface TitleBarProps {
    isDirty: boolean;
    currentFileName: string;
    onNewFile: () => void;
    onOpenFile: () => void;
    onOpenFolder: () => void;
    onSaveFile: () => void;
    onSaveAsFile: () => void;
    onCloseWindow: () => void;
}

export default function TitleBar(props: TitleBarProps) {
    const {
        isDirty, currentFileName, onNewFile, onOpenFile, onOpenFolder,
        onSaveFile, onSaveAsFile, onCloseWindow
    } = props;

    const titleText = `${isDirty ? '*' : ''}${currentFileName} - ${defaultTitle}`;

    const handleMinimize = () => window.electronAPI.minimizeWindow();
    const handleMaximize = () => window.electronAPI.maximizeWindow();

    return (
        <div id="title-bar">
            <div id="menu-bar">
                <div className="menu-item">
                    File
                    <div className="submenu">
                        <div className="submenu-item" onClick={onNewFile}>New File</div>
                        <hr className="submenu-separator" />
                        <div className="submenu-item" onClick={onOpenFile}>Open File...</div>
                        <div className="submenu-item" onClick={onOpenFolder}>Open Folder...</div>
                        <div className="submenu-item" onClick={onSaveFile}>Save</div>
                        <div className="submenu-item" onClick={onSaveAsFile}>Save As...</div>
                        <hr className="submenu-separator" />
                        <div className="submenu-item" onClick={onCloseWindow}>Quit</div>
                    </div>
                </div>
            </div>
            <div id="title">{titleText}</div>
            <div id="title-bar-btns">
                <button id="minimize-btn" onClick={handleMinimize}>-</button>
                <button id="maximize-btn" onClick={handleMaximize}>o</button>
                <button id="close-btn" onClick={onCloseWindow}>x</button>
            </div>
        </div>
    );
}