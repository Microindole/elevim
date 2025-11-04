// src/renderer/App.tsx
import React, { useState, useCallback } from 'react';
import TitleBar from './components/TitleBar/TitleBar';
import Editor from './components/Editor/Editor';
import FileTree from './components/FileTree/FileTree';
import Tabs from './components/Tabs/Tabs';
import StatusBar from './components/StatusBar/StatusBar';
import CommandPalette from './components/CommandPalette/CommandPalette';
import TerminalComponent from './components/Terminal/Terminal';
import GitPanel from './components/GitPanel/GitPanel';
import ActivityBar from './components/ActivityBar/ActivityBar';
import SearchPanel from './components/SearchPanel/SearchPanel';

// Hooks
import { useFileOperations } from './hooks/useFileOperations';
import { useFileTree } from './hooks/useFileTree';
import { useGitStatus } from './hooks/useGitStatus';
import { useSidebar } from './hooks/useSidebar';
import { useTerminal } from './hooks/useTerminal';
import { useCliHandlers } from './hooks/useCliHandlers';
import { useIpcListeners } from './hooks/useIpcListeners';
import { useBranchChange } from './hooks/useBranchChange';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCommands } from './hooks/useCommands';

import './components/App/App.css';

export default function App() {
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);

    // 文件操作
    const {
        openFiles,
        setOpenFiles,
        activeIndex,
        setActiveIndex,
        activeFile,
        cursorLine,
        cursorCol,
        programmaticChangeRef,
        openFile,
        handleSave,
        safeAction,
        handleNewFile,
        handleCloseTab,
        onEditorContentChange,
        handleCursorChange
    } = useFileOperations();

    // 文件树
    const {
        fileTree,
        setFileTree,
        currentOpenFolderPath,
        handleMenuOpenFolder,
        handleFileTreeSelect
    } = useFileTree();

    // 侧边栏
    const {
        sidebarWidth,
        activeSidebarView,
        setActiveSidebarView,
        handleViewChange,
        startResizing
    } = useSidebar();

    // 终端
    const {
        terminalHeight,
        isTerminalVisible,
        setIsTerminalVisible,
        startTerminalResize
    } = useTerminal();

    // Git 状态
    const { gitStatus, setGitStatus } = useGitStatus(currentOpenFolderPath, setFileTree);

    // 菜单处理器
    const handleMenuNewFile = useCallback(() => safeAction(handleNewFile), [safeAction, handleNewFile]);
    const handleMenuOpenFile = useCallback(() => safeAction(() => window.electronAPI.showOpenDialog()), [safeAction]);
    const handleMenuSaveAsFile = useCallback(() => window.electronAPI.triggerSaveAsFile(), []);
    const handleMenuCloseWindow = useCallback(() => safeAction(() => window.electronAPI.closeWindow()), [safeAction]);
    const handleFileTreeSelectWrapper = useCallback((filePath: string) => handleFileTreeSelect(filePath, safeAction), [handleFileTreeSelect, safeAction]);

    // CLI 处理器
    useCliHandlers({
        setFileTree,
        currentOpenFolderPath,
        setActiveSidebarView,
        setOpenFiles,
        setActiveIndex,
        openFile
    });

    // IPC 监听器
    useIpcListeners({ openFile, handleSave, handleNewFile });

    // 分支变更监听
    useBranchChange({
        currentOpenFolderPath,
        setFileTree,
        setGitStatus,
        openFiles,
        activeIndex,
        setOpenFiles
    });

    // 键盘快捷键
    useKeyboardShortcuts({
        setIsPaletteOpen,
        setIsTerminalVisible,
        handleViewChange
    });

    // 命令面板命令
    const commands = useCommands({
        handleMenuNewFile,
        handleMenuOpenFile,
        handleMenuOpenFolder,
        handleSave,
        handleMenuSaveAsFile,
        handleMenuCloseWindow,
        handleViewChange
    });

    return (
        <div className="main-layout">
            <CommandPalette
                isOpen={isPaletteOpen}
                onClose={() => setIsPaletteOpen(false)}
                commands={commands}
            />
            <TitleBar
                isDirty={activeFile?.isDirty ?? false}
                currentFileName={activeFile?.name ?? "Elevim"}
                onNewFile={handleMenuNewFile}
                onOpenFile={handleMenuOpenFile}
                onOpenFolder={handleMenuOpenFolder}
                onSaveFile={handleSave}
                onSaveAsFile={handleMenuSaveAsFile}
                onCloseWindow={handleMenuCloseWindow}
            />
            <Tabs
                files={openFiles}
                activeIndex={activeIndex}
                onTabClick={setActiveIndex}
                onTabClose={handleCloseTab}
            />
            <div className="main-content-area">
                <div className="app-container">
                    <ActivityBar
                        activeView={activeSidebarView}
                        onViewChange={handleViewChange}
                    />
                    {activeSidebarView && fileTree && (
                        <>
                            <div className="sidebar" style={{ width: sidebarWidth }}>
                                {activeSidebarView === 'explorer' && (
                                    <FileTree
                                        treeData={fileTree}
                                        onFileSelect={handleFileTreeSelectWrapper}
                                        gitStatus={gitStatus}
                                    />
                                )}
                                {activeSidebarView === 'git' && (
                                    <GitPanel onClose={() => handleViewChange('git')} />
                                )}
                                {activeSidebarView === 'search' && (
                                    <SearchPanel />
                                )}
                                {activeSidebarView === 'settings' && (
                                    <div style={{ padding: 20 }}>Settings View (Not Implemented)</div>
                                )}
                            </div>
                            <div className="resizer" onMouseDown={startResizing} />
                        </>
                    )}
                    <div className="editor-container">
                        {activeFile ? (
                            <Editor
                                content={activeFile.content}
                                filename={activeFile.name}
                                onDocChange={onEditorContentChange}
                                onSave={handleSave}
                                programmaticChangeRef={programmaticChangeRef}
                                onCursorChange={handleCursorChange}
                            />
                        ) : (
                            <div className="welcome-placeholder">Open a file or folder to start</div>
                        )}
                    </div>
                </div>
                {isTerminalVisible && (
                    <>
                        <div className="terminal-resizer" onMouseDown={startTerminalResize} />
                        <div className="terminal-panel" style={{ height: terminalHeight }}>
                            <TerminalComponent />
                        </div>
                    </>
                )}
            </div>
            <StatusBar cursorLine={cursorLine} cursorCol={cursorCol} />
        </div>
    );
}