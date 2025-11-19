// src/renderer/App.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Allotment } from "allotment";
import "allotment/dist/style.css";

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

    // 文件操作 (确保 openFile 被解构)
    const {
        groups,
        activeGroupId,
        activateGroup,
        setGroupActiveIndex,
        splitEditor,
        closeTab,

        // 兼容属性
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

        // 传递给其他 hook 的更新函数 (需要注意兼容性)
        setGroups, // 替代 setOpenFiles
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

    // --- 使用新的 Git 分支 Hook ---
    const currentBranch = useCurrentBranch(currentOpenFolderPath.current);

    // 处理侧边栏视图切换
    const handleSidebarViewChange = (view: any) => {
        if (view === 'settings') {
            // 点击设置图标 -> 打开设置 Tab
            openFile('elevim://settings', '', 'UTF-8');
            // 如果当前已经在其他侧边栏视图，可以选择关闭它，或者保持不变
            // 这里我们选择不关闭侧边栏，只在编辑器打开设置
        } else {
            handleViewChange(view);
        }
    };

    // 菜单处理器 (使用新的命名空间)
    const handleMenuNewFile = useCallback(() => safeAction(handleNewFile), [safeAction, handleNewFile]);
    const handleMenuOpenFile = useCallback(() => safeAction(() => window.electronAPI.file.showOpenDialog()), [safeAction]);
    const handleMenuSaveAsFile = useCallback(() => window.electronAPI.menu.triggerSaveAsFile(), []);
    const handleMenuCloseWindow = useCallback(() => safeAction(() => window.electronAPI.window.closeWindow()), [safeAction]);
    const handleFileTreeSelectWrapper = useCallback((filePath: string) => handleFileTreeSelect(filePath, safeAction), [handleFileTreeSelect, safeAction]);

    const openFileToLine = (filePath: string, line: number) => {
        // 简单处理：直接调用 openFile，它会处理“打开或激活”
        safeAction(async () => {
            const content = await window.electronAPI.file.openFile(filePath);
            if (content !== null) {
                setJumpToLine({ path: filePath, line: line });
            }
        });
    };

    const handleReplaceComplete = useCallback(async (modifiedFiles: string[]) => {
        if (modifiedFiles.length === 0) return;
        // 简化处理：重新加载所有文件可能会比较复杂，暂略
        // 实际项目中需要遍历 groups 来更新内容
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

    // --- CLI 处理器 ---
    useCliHandlers({
        setFileTree,
        currentOpenFolderPath,
        setActiveSidebarView,
        setOpenFiles: setGroups as any, // ⚠️ 临时类型转换，实际上这可能需要你在 CliHandler 里做适配
        setActiveIndex: () => {}, // 不再需要这个全局 setter，openFile 内部会处理
        openFile
    });

    // --- IPC 监听器 ---
    useIpcListeners({ openFile, handleSave, handleNewFile });

    // 分支变更监听
    useBranchChange({
        currentOpenFolderPath,
        setFileTree,
        setGitStatus,
        openFiles: groups.flatMap(g => g.files), // 扁平化所有文件以供检查 (简单适配)
        activeIndex: 0, // 这里的适配比较勉强
        setOpenFiles: setGroups as any
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
        handleMenuCloseWindow,
        splitEditor
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

    if (!settings) {
        return <div className="main-layout">Loading Settings...</div>;
    }

    // --- 从 activeFile 获取编码 ---
    // (activeFile 来自 useFileOperations hook)
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
                        onViewChange={handleSidebarViewChange} // 使用新的 handler
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
                                {/* 移除 SettingsPanel 的侧边栏渲染 */}
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
            <StatusBar cursorLine={cursorLine} cursorCol={cursorCol} currentBranch={currentBranch} encoding={activeFile ? activeFile.encoding : null} />
        </div>
    );
}