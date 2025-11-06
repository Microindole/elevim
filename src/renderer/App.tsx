// src/renderer/App.tsx
import React, {useState, useCallback, useEffect} from 'react';
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
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import { AppSettings } from '../shared/types';

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
    const [settings, setSettings] = useState<AppSettings | null>(null);

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
        handleCursorChange,
        jumpToLine,
        setJumpToLine
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

    const openFileToLine = (filePath: string, line: number) => {
        const alreadyOpenIndex = openFiles.findIndex(f => f.path === filePath);

        if (alreadyOpenIndex > -1) {
            // 1. 文件已打开：切换 Tab 并设置跳转状态
            setActiveIndex(alreadyOpenIndex);
            setJumpToLine({ path: filePath, line: line });
        } else {
            // 2. 文件未打开：
            safeAction(async () => {
                const content = await window.electronAPI.openFile(filePath);
                if (content !== null) {
                    openFile(filePath, content, line);
                }
            });
        }
    };

    const handleReplaceComplete = useCallback(async (modifiedFiles: string[]) => {
        if (modifiedFiles.length === 0) return;

        // 检查是否有已打开的文件被修改了
        const openFilesToReload = openFiles.filter(
            f => f.path && modifiedFiles.includes(f.path)
        );

        if (openFilesToReload.length > 0) {
            // 重新读取这些文件的内容
            const updatedFileContents = await Promise.all(
                openFilesToReload.map(async f => {
                    const content = await window.electronAPI.openFile(f.path!);
                    return { path: f.path, content };
                })
            );

            // 批量更新 openFiles state
            setOpenFiles(prevOpenFiles =>
                prevOpenFiles.map(file => {
                    const updated = updatedFileContents.find(u => u.path === file.path);
                    if (updated && updated.content !== null) {
                        return { ...file, content: updated.content, isDirty: false };
                    }
                    return file;
                })
            );
            console.log(`[App] Reloaded ${updatedFileContents.length} open editors.`);
        }
    }, [openFiles, setOpenFiles]);

    const handleJumpComplete = useCallback(() => {
        setJumpToLine(null);
    }, []); // setJumpToLine 是稳定的，不需要加入依赖

    // 加载设置
    useEffect(() => {
        const fetchSettings = async () => {
            const loadedSettings = await window.electronAPI.getSettings();
            setSettings(loadedSettings);
        };
        fetchSettings();

        const handleSettingsChange = (event: Event) => {
            const { key, value } = (event as CustomEvent).detail;
            setSettings(prev => ({ ...prev!, [key]: value }));
        };
        window.addEventListener('settings-changed', handleSettingsChange);
        return () => {
            window.removeEventListener('settings-changed', handleSettingsChange);
        };
    }, []);

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
        keymap: settings?.keymap,
        setIsPaletteOpen,
        setIsTerminalVisible,
        handleViewChange,
        handleMenuNewFile,
        handleMenuOpenFile,
        handleMenuOpenFolder,
        handleSave,
        handleMenuSaveAsFile,
        handleMenuCloseWindow
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

    if (!settings) {
        return <div className="main-layout">Loading Settings...</div>;
    }

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
                    {activeSidebarView && (
                        <>
                            <div className="sidebar" style={{ width: sidebarWidth }}>
                                {activeSidebarView === 'explorer' && fileTree && ( // fileTree 仅用于 explorer
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
                                    <SearchPanel
                                        folderPath={currentOpenFolderPath.current}
                                        onResultClick={openFileToLine}
                                        onReplaceComplete={handleReplaceComplete}
                                    />
                                )}
                                {activeSidebarView === 'settings' && (
                                    <SettingsPanel />
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
                                filePath={activeFile.path}
                                onDocChange={onEditorContentChange}
                                onSave={handleSave}
                                programmaticChangeRef={programmaticChangeRef}
                                onCursorChange={handleCursorChange}
                                jumpToLine={jumpToLine}
                                onJumpComplete={handleJumpComplete}
                                initialFontSize={settings.fontSize}
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