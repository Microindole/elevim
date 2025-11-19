// src/renderer/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { v4 as uuidv4 } from 'uuid'; // 引入 uuid

// ... (Imports Components 保持不变) ...
import TitleBar from './components/TitleBar/TitleBar';
import EditorGroup from './components/EditorGroup/EditorGroup';
import FileTree from './components/FileTree/FileTree';
import StatusBar from './components/StatusBar/StatusBar';
import CommandPalette from './components/CommandPalette/CommandPalette';
import TerminalComponent from './components/Terminal/Terminal';
import GitPanel from './components/GitPanel/GitPanel';
import ActivityBar from './components/ActivityBar/ActivityBar';
import SearchPanel from './components/SearchPanel/SearchPanel';
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
import { useCurrentBranch } from './hooks/useCurrentBranch';

import './App.css';

export default function App() {
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isReady, setIsReady] = useState(false); // --- 1. 新增：加载状态 ---

    // 文件操作
    const {
        groups,
        activeGroupId,
        activateGroup,
        setGroupActiveIndex,
        splitEditor,
        closeTab,
        activeFile,
        cursorLine,
        cursorCol,
        programmaticChangeRef,
        openFile,
        handleSave,
        safeAction,
        handleNewFile,
        onEditorContentChange,
        handleCursorChange,
        jumpToLine,
        setJumpToLine,
        setGroups,
    } = useFileOperations();

    // 文件树
    const {
        fileTree,
        setFileTree,
        currentOpenFolderPath,
        handleMenuOpenFolder,
        handleFileTreeSelect
    } = useFileTree();

    // 侧边栏 (解构出 setSidebarWidth)
    const {
        sidebarWidth,
        setSidebarWidth, // --- 2. 使用导出的 setter ---
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
    const currentBranch = useCurrentBranch(currentOpenFolderPath.current);

    // --- 3. 启动时恢复 Session ---
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const session = await window.electronAPI.session.getSession();

                // 恢复文件夹
                if (session.currentFolderPath) {
                    const tree = await window.electronAPI.file.readDirectory(session.currentFolderPath);
                    if (tree) {
                        setFileTree(tree);
                        currentOpenFolderPath.current = session.currentFolderPath;
                        window.electronAPI.git.startGitWatcher(session.currentFolderPath);
                    }
                }

                // 恢复编辑器组
                if (session.groups && session.groups.length > 0) {
                    const restoredGroups = await Promise.all(session.groups.map(async (g: any) => {
                        // 并行读取文件内容
                        const files = await Promise.all(g.files.map(async (path: string) => {
                            try {
                                const content = await window.electronAPI.file.openFile(path);
                                if (content === null) return null; // 文件可能被删除
                                return {
                                    id: uuidv4(),
                                    path: path,
                                    name: path.split(/[\\/]/).pop() || 'Untitled',
                                    content: content,
                                    isDirty: false,
                                    encoding: 'UTF-8' // 暂时默认
                                };
                            } catch {
                                return null;
                            }
                        }));

                        // 过滤掉无效文件
                        const validFiles = files.filter((f: any) => f !== null);

                        return {
                            id: g.id,
                            files: validFiles,
                            activeIndex: g.activeFileIndex
                        };
                    }));

                    const validGroups = restoredGroups.filter((g: any) => g.files.length > 0);

                    if (validGroups.length > 0) {
                        setGroups(validGroups);
                        if (session.activeGroupId) {
                            activateGroup(session.activeGroupId);
                        }
                    }
                }

                // 恢复 UI 状态
                if (session.sidebarWidth) setSidebarWidth(session.sidebarWidth);
                if (session.sidebarView !== undefined) setActiveSidebarView(session.sidebarView);

            } catch (e) {
                console.error('Failed to restore session:', e);
            } finally {
                setIsReady(true); // 无论成功失败，结束加载状态
            }
        };

        restoreSession();
    }, []);

    // --- 4. 自动保存 Session (防抖) ---
    useEffect(() => {
        if (!isReady) return;

        const timer = setTimeout(() => {
            const sessionData = {
                groups: groups.map(g => ({
                    id: g.id,
                    activeFileIndex: g.activeIndex,
                    files: g.files
                        .filter(f => f.path) // 只保存已持久化(有路径)的文件
                        .map(f => f.path)
                })),
                activeGroupId,
                sidebarWidth,
                sidebarView: activeSidebarView,
                currentFolderPath: currentOpenFolderPath.current
            };
            window.electronAPI.session.saveSession(sessionData);
        }, 1000); // 1秒内无变化才保存

        return () => clearTimeout(timer);
    }, [groups, activeGroupId, sidebarWidth, activeSidebarView, currentOpenFolderPath.current, isReady]);

    // 处理侧边栏视图切换
    const handleSidebarViewChange = (view: any) => {
        if (view === 'settings') {
            openFile('elevim://settings', '', 'UTF-8');
        } else {
            handleViewChange(view);
        }
    };

    const handleMenuNewFile = useCallback(() => safeAction(handleNewFile), [safeAction, handleNewFile]);
    const handleMenuOpenFile = useCallback(() => safeAction(() => window.electronAPI.file.showOpenDialog()), [safeAction]);
    const handleMenuSaveAsFile = useCallback(() => window.electronAPI.menu.triggerSaveAsFile(), []);
    const handleMenuCloseWindow = useCallback(() => safeAction(() => window.electronAPI.window.closeWindow()), [safeAction]);
    const handleFileTreeSelectWrapper = useCallback((filePath: string) => handleFileTreeSelect(filePath, safeAction), [handleFileTreeSelect, safeAction]);

    const openFileToLine = (filePath: string, line: number) => {
        safeAction(async () => {
            const content = await window.electronAPI.file.openFile(filePath);
            if (content !== null) {
                setJumpToLine({ path: filePath, line: line });
            }
        });
    };

    const handleReplaceComplete = useCallback(async (modifiedFiles: string[]) => {
        if (modifiedFiles.length === 0) return;
        console.log('Replace complete. TODO: Refresh open editors');
    }, []);

    const handleJumpComplete = useCallback(() => {
        setJumpToLine(null);
    }, []);

    // 加载设置
    useEffect(() => {
        const fetchSettings = async () => {
            const loadedSettings = await window.electronAPI.settings.getSettings();
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

    // Hooks 调用
    useCliHandlers({
        setFileTree,
        currentOpenFolderPath,
        setActiveSidebarView,
        setOpenFiles: setGroups as any,
        setActiveIndex: () => {},
        openFile
    });

    useIpcListeners({ openFile, handleSave, handleNewFile });

    useBranchChange({
        currentOpenFolderPath,
        setFileTree,
        setGitStatus,
        openFiles: groups.flatMap(g => g.files),
        activeIndex: 0,
        setOpenFiles: setGroups as any
    });

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
        handleMenuCloseWindow,
        splitEditor
    });

    const commands = useCommands({
        handleMenuNewFile,
        handleMenuOpenFile,
        handleMenuOpenFolder,
        handleSave,
        handleMenuSaveAsFile,
        handleMenuCloseWindow,
        handleViewChange
    });

    // Ctrl+\ 快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '\\') {
                e.preventDefault();
                splitEditor();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [splitEditor]);

    // --- 5. 渲染加载中状态 ---
    if (!settings || !isReady) {
        return (
            <div className="main-layout" style={{ justifyContent: 'center', alignItems: 'center', color: '#888' }}>
                Restoring Workspace...
            </div>
        );
    }

    const fileEncoding = activeFile ? activeFile.encoding : null;

    return (
        <div className="main-layout">
            <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} commands={commands} />
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
            <div className="main-content-area">
                <div className="app-container">
                    <ActivityBar
                        activeView={activeSidebarView}
                        onViewChange={handleSidebarViewChange}
                    />
                    {activeSidebarView && (
                        <>
                            <div className="sidebar" style={{ width: sidebarWidth }}>
                                {activeSidebarView === 'explorer' && fileTree && (
                                    <FileTree treeData={fileTree} onFileSelect={handleFileTreeSelectWrapper} gitStatus={gitStatus} />
                                )}
                                {activeSidebarView === 'git' && <GitPanel onClose={() => handleViewChange('git')} />}
                                {activeSidebarView === 'search' && (
                                    <SearchPanel folderPath={currentOpenFolderPath.current} onResultClick={openFileToLine} onReplaceComplete={handleReplaceComplete} />
                                )}
                            </div>
                            <div className="resizer" onMouseDown={startResizing} />
                        </>
                    )}
                    <div className="editor-container">
                        <Allotment>
                            {groups.map((group) => (
                                <Allotment.Pane key={group.id} minSize={200}>
                                    <EditorGroup
                                        groupId={group.id}
                                        files={group.files}
                                        activeIndex={group.activeIndex}
                                        isActiveGroup={group.id === activeGroupId}
                                        onActivate={() => activateGroup(group.id)}
                                        onTabClick={(index) => setGroupActiveIndex(group.id, index)}
                                        onTabClose={(index) => closeTab(group.id, index)}
                                        onDocChange={onEditorContentChange}
                                        onSave={handleSave}
                                        onCursorChange={handleCursorChange}
                                        fontSize={settings.fontSize}
                                        programmaticChangeRef={programmaticChangeRef}
                                        jumpToLine={jumpToLine}
                                        onJumpComplete={handleJumpComplete}
                                    />
                                </Allotment.Pane>
                            ))}
                        </Allotment>
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
            <StatusBar cursorLine={cursorLine} cursorCol={cursorCol} currentBranch={currentBranch} encoding={fileEncoding} />
        </div>
    );
}