// src/renderer/components/EditorGroup/EditorGroup.tsx
import React from 'react';
import Tabs, { OpenFile } from '../Tabs/Tabs';
import Editor from '../Editor/Editor';
import SettingsPanel from '../SettingsPanel/SettingsPanel';
import './EditorGroup.css';

interface EditorGroupProps {
    groupId: string;
    files: OpenFile[];
    activeIndex: number;
    isActiveGroup: boolean;
    onActivate: () => void;
    onTabClick: (index: number) => void;
    onTabClose: (index: number) => void;
    onDocChange: (doc: string) => void;
    onSave: () => void;
    onCursorChange: (line: number, col: number) => void;
    fontSize: number;
    programmaticChangeRef: React.MutableRefObject<boolean>;
    jumpToLine: { path: string | null, line: number } | null;
    onJumpComplete: () => void;
}

// 一个内部组件：空状态展示
const EmptyState = () => (
    <div className="empty-group-placeholder">
        <div className="empty-state-content">
            <div className="app-logo-watermark">Elevim</div>
            <p className="shortcut-hint">Show All Commands <span className="key">Ctrl</span>+<span className="key">Shift</span>+<span className="key">P</span></p>
            <p className="shortcut-hint">Go to File <span className="key">Ctrl</span>+<span className="key">P</span></p>
            <p className="shortcut-hint">New File <span className="key">Ctrl</span>+<span className="key">N</span></p>
            <p className="shortcut-hint">Open File <span className="key">Ctrl</span>+<span className="key">O</span></p>
        </div>
    </div>
);

export default function EditorGroup(props: EditorGroupProps) {
    const {
        files, activeIndex, isActiveGroup,
        onActivate, onTabClick, onTabClose,
        onDocChange, onSave, onCursorChange,
        fontSize, programmaticChangeRef, jumpToLine, onJumpComplete
    } = props;

    const activeFile = files[activeIndex];

    const renderContent = () => {
        // 没有文件时显示 EmptyState
        if (!activeFile) {
            return <EmptyState />;
        }

        if (activeFile.path === 'elevim://settings') {
            return <SettingsPanel />;
        }

        return (
            <Editor
                key={activeFile.id}
                content={activeFile.content}
                filename={activeFile.name}
                filePath={activeFile.path}
                onDocChange={onDocChange}
                onSave={onSave}
                programmaticChangeRef={programmaticChangeRef}
                onCursorChange={onCursorChange}
                jumpToLine={jumpToLine}
                onJumpComplete={onJumpComplete}
                initialFontSize={fontSize}
            />
        );
    };

    return (
        <div
            className={`editor-group ${isActiveGroup ? 'active' : ''}`}
            onClick={onActivate}
            onFocus={onActivate}
            tabIndex={0} // 允许 div 获得焦点
        >
            {/* 只有在有文件时才显示 Tabs 栏 */}
            {files.length > 0 && (
                <Tabs
                    files={files}
                    activeIndex={activeIndex}
                    onTabClick={onTabClick}
                    onTabClose={onTabClose}
                />
            )}

            <div className="editor-group-content">
                {renderContent()}
            </div>

            {isActiveGroup && <div className="active-group-indicator" />}
        </div>
    );
}