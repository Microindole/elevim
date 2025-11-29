// src/renderer/app/controllers/useAppController.ts
import { useState, useCallback, useEffect, useMemo } from 'react';
import { AppSettings } from '../../../shared/types';
import { CommandRegistry } from '../../features/workbench/commands/types';

// Hooks
import { useFileOperations } from '../../features/editor/hooks/useFileOperations';
import { useFileTree } from '../../features/explorer/hooks/useFileTree';
import { useGitStatus } from '../../features/git/hooks/useGitStatus';
import { useSidebar } from '../../features/workbench/hooks/useSidebar';
import { useTerminal } from '../../features/terminal/hooks/useTerminal';
import { useCliHandlers } from '../../features/explorer/hooks/useCliHandlers';
import { useIpcListeners } from '../../../shared/hooks/useIpcListeners';
import { useBranchChange } from '../../features/git/hooks/useBranchChange';
import { useKeyboardShortcuts } from '../../features/workbench/hooks/useKeyboardShortcuts';
import { useCommands } from '../../features/workbench/hooks/useCommands';
import { useCurrentBranch } from '../../features/git/hooks/useCurrentBranch';
import { useSessionManager } from './useSessionManager';
import { useGlobalEvents } from '../../../shared/hooks/useGlobalEvents';

export function useAppController() {
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isZenMode, setIsZenMode] = useState(false);

    // 1. 初始化基础 Hooks
    const fileOps = useFileOperations();
    const sidebar = useSidebar();
    const terminal = useTerminal();
    const fileTree = useFileTree();

    // 2. 依赖关系处理 (Wrappers)
    const handleMenuNewFile = useCallback(() => fileOps.safeAction(fileOps.handleNewFile), [fileOps]);
    const handleMenuOpenFile = useCallback(() => fileOps.safeAction(() => window.electronAPI.file.showOpenDialog()), [fileOps]);
    const handleMenuSaveAsFile = useCallback(() => window.electronAPI.menu.triggerSaveAsFile(), []);
    const handleMenuCloseWindow = useCallback(() => fileOps.safeAction(() => window.electronAPI.window.closeWindow()), [fileOps]);

    const handleFileTreeSelectWrapper = useCallback((filePath: string) => {
        fileTree.handleFileTreeSelect(filePath, fileOps.safeAction);
    }, [fileTree, fileOps]);

    const openFileToLine = useCallback((filePath: string, line: number) => {
        fileOps.safeAction(async () => {
            const content = await window.electronAPI.file.openFile(filePath);
            if (content !== null) {
                fileOps.setJumpToLine({ path: filePath, line: line });
            }
        });
    }, [fileOps]);

    const handleReplaceComplete = useCallback(async (modifiedFiles: string[]) => {
        if (modifiedFiles.length > 0) {
            console.log('Replace complete.');
        }
    }, []);

    // 3. 处理高级状态 (Git, Session, Events)
    const { gitStatus, setGitStatus } = useGitStatus(fileTree.currentOpenFolderPath, fileTree.setFileTree);
    const currentBranch = useCurrentBranch(fileTree.currentOpenFolderPath.current);

    const { isReady } = useSessionManager({
        groups: fileOps.groups,
        activeGroupId: fileOps.activeGroupId,
        sidebarWidth: sidebar.sidebarWidth,
        activeSidebarView: sidebar.activeSidebarView,
        currentOpenFolderPath: fileTree.currentOpenFolderPath,
        setFileTree: fileTree.setFileTree,
        setGroups: fileOps.setGroups,
        activateGroup: fileOps.activateGroup,
        setSidebarWidth: sidebar.setSidebarWidth,
        setActiveSidebarView: sidebar.setActiveSidebarView
    });

    useGlobalEvents({
        setSettings,
        handleFileTreeSelectWrapper,
        setJumpToLine: fileOps.setJumpToLine
    });

    // 4. 其他逻辑 Hooks
    useCliHandlers({
        setFileTree: fileTree.setFileTree,
        currentOpenFolderPath: fileTree.currentOpenFolderPath,
        setActiveSidebarView: sidebar.setActiveSidebarView,
        setOpenFiles: fileOps.setGroups as any,
        setActiveIndex: () => {},
        openFile: fileOps.openFile
    });

    useIpcListeners({
        openFile: fileOps.openFile,
        handleSave: fileOps.handleSave,
        handleNewFile: fileOps.handleNewFile
    });

    useBranchChange({
        currentOpenFolderPath: fileTree.currentOpenFolderPath,
        setFileTree: fileTree.setFileTree,
        setGitStatus,
        openFiles: fileOps.groups.flatMap(g => g.files),
        activeIndex: 0,
        setOpenFiles: fileOps.setGroups as any
    });

    const handleSidebarViewChange = (view: any) => {
        if (view === 'settings') {
            fileOps.openFile('elevim://settings', '', 'UTF-8');
        } else {
            sidebar.handleViewChange(view);
        }
    };

    // Zen Mode 逻辑
    const toggleZenMode = useCallback(() => {
        setIsZenMode(prev => !prev);
    }, []);

    // --- 核心：构建命令注册表 ---
    // 将所有具体的实现映射到 Command ID
    const commandRegistry = useMemo<CommandRegistry>(() => ({
        'file.new': handleMenuNewFile,
        'file.open': handleMenuOpenFile,
        'file.openFolder': fileTree.handleMenuOpenFolder,
        'file.save': fileOps.handleSave,
        'file.saveAs': handleMenuSaveAsFile,
        'app.quit': handleMenuCloseWindow,
        'view.togglePalette': () => setIsPaletteOpen(prev => !prev),
        'view.toggleTerminal': () => terminal.setIsTerminalVisible(prev => !prev),
        'view.toggleGitPanel': () => sidebar.handleViewChange('git'),
        'view.toggleSearchPanel': () => sidebar.handleViewChange('search'),
        'view.splitEditor': fileOps.splitEditor,
        'view.toggleZenMode': toggleZenMode,
        // 'editor.save' 通常是编辑器内部处理
    }), [
        handleMenuNewFile, handleMenuOpenFile, fileTree.handleMenuOpenFolder,
        fileOps.handleSave, handleMenuSaveAsFile, handleMenuCloseWindow,
        terminal.setIsTerminalVisible, sidebar.handleViewChange, fileOps.splitEditor,
        toggleZenMode
    ]);

    // 键盘快捷键
    useKeyboardShortcuts({
        keymap: settings?.keymap,
        commandRegistry
    });

    const commands = useCommands({ commandRegistry });

    // 5. 组装返回给 View 的 Props
    return {
        // Core State
        isReady,
        settings,
        isPaletteOpen,
        setIsPaletteOpen,

        // Hooks & Logic Groups
        fileOps,

        // Sidebar View Data
        sidebar: {
            sidebarWidth: sidebar.sidebarWidth,
            activeSidebarView: sidebar.activeSidebarView,
            startResizing: sidebar.startResizing,
            handleViewChange: sidebar.handleViewChange,
            handleSidebarViewChange
        },

        // FileTree & Git View Data
        fileTree: {
            data: fileTree.fileTree,
            currentOpenFolderPath: fileTree.currentOpenFolderPath,
            handleMenuOpenFolder: fileTree.handleMenuOpenFolder,
            handleFileTreeSelectWrapper
        },
        git: {
            status: gitStatus,
            currentBranch
        },

        // Terminal View Data
        terminal: {
            height: terminal.terminalHeight,
            isVisible: terminal.isTerminalVisible,
            startResize: terminal.startTerminalResize
        },

        // Search View Data
        search: {
            handleReplaceComplete,
            openFileToLine
        },

        // Commands & Menus
        commands,
        menuHandlers: {
            handleNewFile: handleMenuNewFile,
            handleOpenFile: handleMenuOpenFile,
            handleOpenFolder: fileTree.handleMenuOpenFolder,
            handleSave: fileOps.handleSave,
            handleSaveAs: handleMenuSaveAsFile,
            handleCloseWindow: handleMenuCloseWindow
        },

        // Misc
        handleBreadcrumbFileSelect: handleFileTreeSelectWrapper,
        isZenMode
    };
}