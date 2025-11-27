// src/renderer/layouts/MainLayout.tsx
import React from 'react';
import { Allotment } from "allotment";
import "allotment/dist/style.css";

import TitleBar from '../components/TitleBar/TitleBar';
import EditorGroup from '../components/EditorGroup/EditorGroup';
import FileTree from '../components/FileTree/FileTree';
import StatusBar from '../components/StatusBar/StatusBar';
import CommandPalette from '../components/CommandPalette/CommandPalette';
import TerminalComponent from '../components/Terminal/Terminal';
import GitPanel from '../components/GitPanel/GitPanel';
import ActivityBar from '../components/ActivityBar/ActivityBar';
import SearchPanel from '../components/SearchPanel/SearchPanel';
import { AppSettings } from '../../shared/types';

// 定义这个 Layout 需要的所有数据接口
export interface MainLayoutProps {
    // 状态
    settings: AppSettings | null;
    isPaletteOpen: boolean;
    setIsPaletteOpen: (open: boolean) => void;

    // File Ops
    fileOps: any; // 为了简化，这里暂时用 any，或者你可以引入 useFileOperations 的返回类型

    // Sidebar
    sidebar: {
        sidebarWidth: number;
        activeSidebarView: any;
        startResizing: () => void;
        handleViewChange: (view: any) => void;
        handleSidebarViewChange: (view: any) => void;
    };

    // File Tree & Git
    fileTree: {
        data: any;
        currentOpenFolderPath: React.MutableRefObject<string | null>;
        handleMenuOpenFolder: () => Promise<any>;
        handleFileTreeSelectWrapper: (path: string) => void;
    };
    git: {
        status: any;
        currentBranch: string | null;
    };

    // Terminal
    terminal: {
        height: number;
        isVisible: boolean;
        startResize: () => void;
    };

    // Search
    search: {
        handleReplaceComplete: (files: string[]) => void;
        openFileToLine: (path: string, line: number) => void;
    };

    // Menus & Commands
    commands: any[];
    menuHandlers: {
        handleNewFile: () => void;
        handleOpenFile: () => void;
        handleOpenFolder: () => void;
        handleSave: () => void;
        handleSaveAs: () => void;
        handleCloseWindow: () => void;
    };

    // Breadcrumbs / Other
    handleBreadcrumbFileSelect: (path: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = (props) => {
    const {
        settings, isPaletteOpen, setIsPaletteOpen,
        fileOps, sidebar, fileTree, git, terminal, search,
        commands, menuHandlers, handleBreadcrumbFileSelect
    } = props;

    const themeColors = settings ? settings.theme.colors : null;
    const fileEncoding = fileOps.activeFile ? fileOps.activeFile.encoding : null;

    return (
        <div className="main-layout">
            <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} commands={commands} />

            <TitleBar
                isDirty={fileOps.activeFile?.isDirty ?? false}
                currentFileName={fileOps.activeFile?.name ?? "Elevim"}
                onNewFile={menuHandlers.handleNewFile}
                onOpenFile={menuHandlers.handleOpenFile}
                onOpenFolder={menuHandlers.handleOpenFolder}
                onSaveFile={menuHandlers.handleSave}
                onSaveAsFile={menuHandlers.handleSaveAs}
                onCloseWindow={menuHandlers.handleCloseWindow}
            />

            <div className="main-content-area">
                <div className="app-container">
                    <ActivityBar
                        activeView={sidebar.activeSidebarView}
                        onViewChange={sidebar.handleSidebarViewChange}
                    />
                    {sidebar.activeSidebarView && (
                        <>
                            <div className="sidebar" style={{ width: sidebar.sidebarWidth }}>
                                {sidebar.activeSidebarView === 'explorer' && fileTree.data && (
                                    <FileTree
                                        treeData={fileTree.data}
                                        onFileSelect={fileTree.handleFileTreeSelectWrapper}
                                        gitStatus={git.status}
                                    />
                                )}
                                {sidebar.activeSidebarView === 'git' && (
                                    <GitPanel onClose={() => sidebar.handleViewChange('git')} />
                                )}
                                {sidebar.activeSidebarView === 'search' && (
                                    <SearchPanel
                                        folderPath={fileTree.currentOpenFolderPath.current}
                                        onResultClick={search.openFileToLine}
                                        onReplaceComplete={search.handleReplaceComplete}
                                    />
                                )}
                            </div>
                            <div className="resizer" onMouseDown={sidebar.startResizing} />
                        </>
                    )}

                    <div className="editor-container">
                        <Allotment>
                            {fileOps.groups.map((group: any) => (
                                <Allotment.Pane key={group.id} minSize={200}>
                                    <EditorGroup
                                        groupId={group.id}
                                        files={group.files}
                                        activeIndex={group.activeIndex}
                                        isActiveGroup={group.id === fileOps.activeGroupId}
                                        onActivate={() => fileOps.activateGroup(group.id)}
                                        onTabClick={(index: number) => fileOps.setGroupActiveIndex(group.id, index)}
                                        onTabClose={(index: number) => fileOps.closeTab(group.id, index)}
                                        onDocChange={fileOps.onEditorContentChange}
                                        onSave={fileOps.handleSave}
                                        onCursorChange={fileOps.handleCursorChange}
                                        fontSize={settings?.fontSize || 14}
                                        programmaticChangeRef={fileOps.programmaticChangeRef}
                                        jumpToLine={fileOps.jumpToLine}
                                        onJumpComplete={() => fileOps.setJumpToLine(null)}
                                        projectPath={fileTree.currentOpenFolderPath.current}
                                        onOpenFile={handleBreadcrumbFileSelect}
                                        themeColors={themeColors}
                                    />
                                </Allotment.Pane>
                            ))}
                        </Allotment>
                    </div>
                </div>

                {terminal.isVisible && (
                    <>
                        <div className="terminal-resizer" onMouseDown={terminal.startResize} />
                        <div className="terminal-panel" style={{ height: terminal.height }}>
                            <TerminalComponent />
                        </div>
                    </>
                )}
            </div>

            <StatusBar
                cursorLine={fileOps.cursorLine}
                cursorCol={fileOps.cursorCol}
                currentBranch={git.currentBranch}
                encoding={fileEncoding}
            />
        </div>
    );
};