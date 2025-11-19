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

export default function EditorGroup(props: EditorGroupProps) {
    const {
        files, activeIndex, isActiveGroup,
        onActivate, onTabClick, onTabClose,
        onDocChange, onSave, onCursorChange,
        fontSize, programmaticChangeRef, jumpToLine, onJumpComplete
    } = props;

    const activeFile = files[activeIndex];

    // 渲染内容区的辅助函数
    const renderContent = () => {
        if (!activeFile) {
            return <div className="empty-group-placeholder">No files open</div>;
        }

        // 检查是否是设置页面
        if (activeFile.path === 'elevim://settings') {
            return <SettingsPanel />;
        }

        // 默认渲染代码编辑器
        return (
            <Editor
                key={activeFile.path || `untitled-${activeIndex}-${files.length}`}
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
        >
            <Tabs
                files={files}
                activeIndex={activeIndex}
                onTabClick={onTabClick}
                onTabClose={onTabClose}
            />
            <div className="editor-group-content">
                {renderContent()}
            </div>
            {isActiveGroup && <div className="active-group-indicator" />}
        </div>
    );
}