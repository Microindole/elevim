// src/renderer/app/controllers/useAppController.ts
import { useState, useCallback, useEffect } from 'react';
import { AppSettings} from '../../../shared/types';

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

    // 1. 初始化基础 Hooks
    const fileOps = useFileOperations();
    const sidebar = useSidebar();
    const terminal = useTerminal();
    const fileTree = useFileTree();

    // 2. 依赖关系处理 (Wrappers)

    // 封装安全操作 (带保存提示)
    const handleMenuNewFile = useCallback(() => fileOps.safeAction(fileOps.handleNewFile), [fileOps]);
    const handleMenuOpenFile = useCallback(() => fileOps.safeAction(() => window.electronAPI.file.showOpenDialog()), [fileOps]);
    const handleMenuSaveAsFile = useCallback(() => window.electronAPI.menu.triggerSaveAsFile(), []);
    const handleMenuCloseWindow = useCallback(() => fileOps.safeAction(() => window.electronAPI.window.closeWindow()), [fileOps]);

    // 封装文件树选择逻辑
    const handleFileTreeSelectWrapper = useCallback((filePath: string) => {
        fileTree.handleFileTreeSelect(filePath, fileOps.safeAction);
    }, [fileTree, fileOps]);

    // 封装从搜索面板打开文件的逻辑
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

    // Git 状态依赖于当前文件夹
    const { gitStatus, setGitStatus } = useGitStatus(fileTree.currentOpenFolderPath, fileTree.setFileTree);
    const currentBranch = useCurrentBranch(fileTree.currentOpenFolderPath.current);

    // Session 管理 (提取出的 Hook)
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

    // 全局事件监听 (提取出的 Hook)
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
        setActiveIndex: () => {}, // 简化处理，实际可以通过增强 fileOps 来处理
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

    // 键盘快捷键
    useKeyboardShortcuts({
        keymap: settings?.keymap,
        setIsPaletteOpen,
        setIsTerminalVisible: terminal.setIsTerminalVisible,
        handleViewChange: sidebar.handleViewChange,
        handleMenuNewFile,
        handleMenuOpenFile,
        handleMenuOpenFolder: fileTree.handleMenuOpenFolder,
        handleSave: fileOps.handleSave,
        handleMenuSaveAsFile,
        handleMenuCloseWindow,
        splitEditor: fileOps.splitEditor
    });

    // 分屏快捷键监听 (保留在 Controller 或移入 KeyboardShortcuts)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '\\') {
                e.preventDefault();
                fileOps.splitEditor();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [fileOps]);

    const handleSidebarViewChange = (view: any) => {
        if (view === 'settings') {
            fileOps.openFile('elevim://settings', '', 'UTF-8');
        } else {
            sidebar.handleViewChange(view);
        }
    };

    const commands = useCommands({
        handleMenuNewFile,
        handleMenuOpenFile,
        handleMenuOpenFolder: fileTree.handleMenuOpenFolder,
        handleSave: fileOps.handleSave,
        handleMenuSaveAsFile,
        handleMenuCloseWindow,
        handleViewChange: sidebar.handleViewChange
    });

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
        handleBreadcrumbFileSelect: handleFileTreeSelectWrapper
    };
}