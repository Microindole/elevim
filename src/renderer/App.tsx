// src/renderer/App.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TitleBar from './components/TitleBar/TitleBar';
import Editor from './components/Editor/Editor';
import FileTree, { FileNode } from './components/FileTree/FileTree';
import Tabs, { OpenFile } from './components/Tabs/Tabs';
import StatusBar from './components/StatusBar/StatusBar';
import CommandPalette, { Command } from './components/CommandPalette/CommandPalette';
import TerminalComponent from './components/Terminal/Terminal';
import { GitStatusMap } from "../main/lib/git-service";
import GitPanel from './components/GitPanel/GitPanel';

import './components/App/App.css';

const welcomeFile: OpenFile = {
    path: null,
    name: "Welcome",
    content: "// Welcome to Elevim!\n// Use File > Open File... to open a file or folder.",
    isDirty: false
};

export default function App() {

    // === 命令行面板的可见性 ===
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);

    // --- 状态 ---
    const [openFiles, setOpenFiles] = useState<OpenFile[]>([welcomeFile]);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [fileTree, setFileTree] = useState<FileNode | null>(null);
    const [sidebarWidth, setSidebarWidth] = useState(250);
    const isResizing = useRef(false);
    const programmaticChangeRef = useRef(false);
    const [cursorLine, setCursorLine] = useState(1);
    const [cursorCol, setCursorCol] = useState(1);
    const [terminalHeight, setTerminalHeight] = useState(200); // 终端面板的初始高度
    const [isTerminalVisible, setIsTerminalVisible] = useState(false); // 终端默认隐藏
    const isResizingTerminal = useRef(false);

    const [gitStatus, setGitStatus] = useState<GitStatusMap>({});
    const gitStatusIntervalRef = useRef<NodeJS.Timeout | null>(null); // 用于定时刷新
    const currentOpenFolderPath = useRef<string | null>(null); // 记录当前打开的文件夹
    const appStateRef = useRef({ openFiles, activeIndex });

    const [isGitPanelOpen, setIsGitPanelOpen] = useState(false);

    

    // --- 派生状态 ---
    const activeFile = openFiles[activeIndex];

    // --- 文件操作逻辑 ---

    const openFile = useCallback((filePath: string, fileContent: string) => {
        setOpenFiles(prevFiles => {
            if (prevFiles.length === 1 && prevFiles[0].name === "Welcome") {
                const newFile: OpenFile = { path: filePath, name: filePath.split(/[\\/]/).pop() ?? "Untitled", content: fileContent, isDirty: false };
                setActiveIndex(0);
                return [newFile];
            }
            const alreadyOpenIndex = prevFiles.findIndex(f => f.path === filePath);
            if (alreadyOpenIndex > -1) {
                setActiveIndex(alreadyOpenIndex);
                return prevFiles;
            } else {
                const newFile: OpenFile = { path: filePath, name: filePath.split(/[\\/]/).pop() ?? "Untitled", content: fileContent, isDirty: false };
                setActiveIndex(prevFiles.length);
                return [...prevFiles, newFile];
            }
        });
    }, []); // 依赖为空，绝对稳定

    const handleSave = useCallback(async () => {
        const { openFiles, activeIndex } = appStateRef.current;
        const currentActiveFile = openFiles[activeIndex];
        if (!currentActiveFile || currentActiveFile.name === "Welcome") return;

        const savedPath = await window.electronAPI.saveFile(currentActiveFile.content);
        if (savedPath) {
            setOpenFiles(prev => prev.map((file, index) => {
                if (index === appStateRef.current.activeIndex) {
                    return { ...file, path: savedPath, name: savedPath.split(/[\\/]/).pop() ?? "Untitled", isDirty: false };
                }
                return file;
            }));
        }
    }, []); // 依赖为空，绝对稳定

    const safeAction = useCallback(async (action: () => void) => {
        // 使用 ref 获取当前最新的文件状态
        const { openFiles, activeIndex } = appStateRef.current;
        const fileToCheck = openFiles[activeIndex];

        // 如果没有活动文件，或者文件是干净的，或者是一个不可保存的欢迎页，则直接执行操作
        if (!fileToCheck || !fileToCheck.isDirty || fileToCheck.name === "Welcome") {
            action();
            return;
        }

        // 如果文件是脏的，显示保存对话框
        const choice = await window.electronAPI.showSaveDialog();

        if (choice === 'save') {
            // 调用我们已经存在的、稳定的 handleSave 函数
            await handleSave();
            // 保存成功后执行后续操作
            action();
        } else if (choice === 'dont-save') {
            action();
        }
        // 如果选择是 'cancel'，则什么都不做
    }, [handleSave]); // 依赖稳定的 handleSave

    const handleNewFile = useCallback(() => {
        const newFile: OpenFile = { path: null, name: "Untitled", content: "", isDirty: false };
        setOpenFiles(prev => {
            setActiveIndex(prev.length);
            return [...prev, newFile];
        });
    }, []); // 依赖为空，绝对稳定

    const handleCloseTab = useCallback((indexToClose: number) => {
        const fileToClose = appStateRef.current.openFiles[indexToClose];

        const closeAction = () => {
            setOpenFiles(prevFiles => {
                const newFiles = prevFiles.filter((_, index) => index !== indexToClose);
                if (newFiles.length === 0) {
                    setActiveIndex(0);
                    return [welcomeFile];
                }

                const currentActiveIndex = appStateRef.current.activeIndex;
                // 如果关闭的是当前激活的标签，或者关闭后当前激活的标签索引需要前移
                if (currentActiveIndex >= indexToClose && currentActiveIndex > 0) {
                    setActiveIndex(prev => prev - 1);
                }
                return newFiles;
            });
        };

        // 如果要关闭的标签不是当前激活的标签，我们为它创建一个临时的 safeAction
        if (appStateRef.current.activeIndex !== indexToClose) {
            // 创建一个临时的、针对特定文件的 safeAction 逻辑
            (async () => {
                if (!fileToClose.isDirty) {
                    closeAction();
                    return;
                }
                const choice = await window.electronAPI.showSaveDialog();
                if (choice === 'save') {
                    await window.electronAPI.saveFile(fileToClose.content); // 直接保存内容
                    closeAction();
                } else if (choice === 'dont-save') {
                    closeAction();
                }
            })();
        } else {
            // 如果关闭的是当前激活的标签，直接使用我们通用的 safeAction
            safeAction(closeAction);
        }

    }, [safeAction]); // 现在它只依赖于稳定的 safeAction

    const onEditorContentChange = useCallback((doc: string) => {
        if (programmaticChangeRef.current) {
            programmaticChangeRef.current = false;
            return;
        }
        setOpenFiles(prevOpenFiles => {
            const currentIndex = appStateRef.current.activeIndex;
            if (currentIndex < 0 || currentIndex >= prevOpenFiles.length || prevOpenFiles[currentIndex].name === "Welcome") {
                return prevOpenFiles;
            }
            return prevOpenFiles.map((file, index) => {
                if (index === currentIndex && file.content !== doc) {
                    return { ...file, content: doc, isDirty: true };
                }
                return file;
            });
        });
    }, []); // 依赖为空，绝对稳定

    const handleCursorChange = useCallback((line: number, col: number) => {
        setCursorLine(line);
        setCursorCol(col);
    }, []);

    useEffect(() => {
        appStateRef.current = { openFiles, activeIndex };
    }, [openFiles, activeIndex]);

    // --- IPC 事件监听 ---
    // 因为所有回调现在都绝对稳定了，这个 useEffect 只会在组件挂载时运行一次
    useEffect(() => {
        const unregisterFileOpen = window.electronAPI.onFileOpen((data) => openFile(data.filePath, data.content));
        const unregisterTriggerSave = window.electronAPI.onTriggerSave(handleSave);
        const unregisterNewFile = window.electronAPI.onNewFile(handleNewFile);
        return () => {
            unregisterFileOpen();
            unregisterTriggerSave();
            unregisterNewFile();
        };
    }, [openFile, handleSave, handleNewFile]); // 依赖是绝对稳定的函数

    // --- 菜单栏和文件树处理器---
    const handleMenuNewFile = useCallback(() => safeAction(handleNewFile), [safeAction, handleNewFile]);
    const handleMenuOpenFile = useCallback(() => safeAction(() => window.electronAPI.showOpenDialog()), [safeAction]);
    const handleMenuOpenFolder = useCallback(async () => {
        const tree = await window.electronAPI.openFolder();
        if (tree) {
            setFileTree(tree);
            currentOpenFolderPath.current = tree.path;

            // 停止旧的 Git 监听
            await window.electronAPI.stopGitWatcher();

            // 启动新的 Git 监听
            await window.electronAPI.startGitWatcher(tree.path);

            // 触发 Git 面板刷新
            window.dispatchEvent(new Event('folder-changed'));

            // 如果 Git 面板打开，刷新它
            if (isGitPanelOpen) {
                setIsGitPanelOpen(false);
                setTimeout(() => setIsGitPanelOpen(true), 100);
            }
        } else {
            currentOpenFolderPath.current = null;
            setGitStatus({});
            await window.electronAPI.stopGitWatcher();
            setIsGitPanelOpen(false);
        }
    }, [isGitPanelOpen]);
    const handleMenuSaveAsFile = useCallback(() => window.electronAPI.triggerSaveAsFile(), []);
    const handleMenuCloseWindow = useCallback(() => safeAction(() => window.electronAPI.closeWindow()), [safeAction]);
    const handleFileTreeSelect = useCallback((filePath: string) => safeAction(() => window.electronAPI.openFile(filePath)), [safeAction]);

    const fetchGitStatus = useCallback(async () => {
        const currentFolder = currentOpenFolderPath.current;
        // 仅在确实打开了文件夹时才请求
        if (currentOpenFolderPath.current) {

            try {
                // console.log("Requesting git status...");
                const status = await window.electronAPI.getGitStatus();
                // console.log("Received git status:", status);
                setGitStatus(status);

                const updatedTree = await window.electronAPI.readDirectory(currentFolder);
                if (updatedTree) {
                    console.log("Directory structure updated."); // 添加日志
                    setFileTree(updatedTree); // <<< 更新 fileTree state
                } else {
                    console.warn("Failed to refresh directory structure."); // 添加日志
                }
            } catch (error) {
                setGitStatus({}); // 出错时清空

            }
        } else {
            setGitStatus({}); // 没有文件夹，确保状态为空
            setFileTree(null);
        }
    }, []);
    // --- 组件卸载时清除定时器 ---
    useEffect(() => {
        return () => {
            if (gitStatusIntervalRef.current) {
                clearInterval(gitStatusIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const unsubscribe = window.electronAPI.onGitStatusChange((status: GitStatusMap) => {
            console.log('[Renderer] Git status updated');
            setGitStatus(status);

            // 可选：只刷新文件树而不重新读取目录
            // 这样更高效
        });

        return () => {
            unsubscribe();
            window.electronAPI.stopGitWatcher();
        };
    }, []);

    useEffect(() => {
        // 监听分支切换事件
        const handleBranchChange = async () => {
            if (currentOpenFolderPath.current) {
                // 重新读取文件树
                const updatedTree = await window.electronAPI.readDirectory(
                    currentOpenFolderPath.current
                );
                if (updatedTree) {
                    setFileTree(updatedTree);
                }

                // 刷新 Git 状态
                const newStatus = await window.electronAPI.getGitStatus();
                setGitStatus(newStatus);

                // 可选：重新加载当前打开的文件
                const currentFile = openFiles[activeIndex];
                if (currentFile?.path) {
                    const content = await window.electronAPI.openFile(currentFile.path);
                    if (content !== null) {
                        setOpenFiles(prev => prev.map((f, i) =>
                            i === activeIndex ? { ...f, content, isDirty: false } : f
                        ));
                    }
                }
            }
        };

        window.addEventListener('git-branch-changed', handleBranchChange);
        return () => window.removeEventListener('git-branch-changed', handleBranchChange);
    }, [openFiles, activeIndex]);

    // 侧边栏拖动逻辑 (保持不变)
    const startResizing = useCallback(() => { isResizing.current = true; }, []);
    const stopResizing = useCallback(() => { isResizing.current = false; }, []);
    const resize = useCallback((e: MouseEvent) => {
        if (isResizing.current) setSidebarWidth(e.clientX);
    }, []);

    const commands = useMemo<Command[]>(() => [
        { id: 'file.new', name: 'File: New File', action: handleMenuNewFile },
        { id: 'file.open', name: 'File: Open File...', action: handleMenuOpenFile },
        { id: 'file.openFolder', name: 'File: Open Folder...', action: handleMenuOpenFolder },
        { id: 'file.save', name: 'File: Save', action: handleSave },
        { id: 'file.saveAs', name: 'File: Save As...', action: handleMenuSaveAsFile },
        { id: 'app.quit', name: 'Application: Quit', action: handleMenuCloseWindow },
        { id: 'git.toggle', name: 'Git: Toggle Source Control', action: () => setIsGitPanelOpen(prev => !prev) },
        // 未来可以添加更多命令，如 "Theme: Switch to Light Mode"
    ], [handleMenuNewFile, handleMenuOpenFile, handleMenuOpenFolder, handleSave, handleMenuSaveAsFile, handleMenuCloseWindow]);


    const startTerminalResize = useCallback(() => { isResizingTerminal.current = true; }, []);
    const stopTerminalResize = useCallback(() => { isResizingTerminal.current = false; }, []);

    const resizeTerminal = useCallback((e: MouseEvent) => {
        if (isResizingTerminal.current) {
            // 高度 = 窗口高度 - 鼠标Y坐标
            const newHeight = window.innerHeight - e.clientY;
            setTerminalHeight(Math.max(30, newHeight)); // 最小高度 30px
        }
    }, []);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // 检查是否按下了 Ctrl + Shift + P
            if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
                e.preventDefault(); // 阻止浏览器默认行为
                setIsPaletteOpen(prev => !prev); // 切换命令面板的可见性
            }

            if (e.ctrlKey && e.key === '`') {
                e.preventDefault();
                setIsTerminalVisible(prev => !prev);
            }

            // Ctrl + Shift + G - Git 面板
            if (e.ctrlKey && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
                e.preventDefault();
                setIsGitPanelOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);

        // 组件卸载时移除监听器，以防内存泄漏
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [openFile, handleSave, handleNewFile]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    useEffect(() => {
        // 注意：这里需要把事件监听器加在 window 上
        const handleMove = (e: MouseEvent) => resizeTerminal(e);
        const handleUp = () => stopTerminalResize();

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [resizeTerminal, stopTerminalResize]); // 依赖稳定函数

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
                    {fileTree && (
                        <>
                            <div className="sidebar" style={{width: sidebarWidth}}>
                                <FileTree
                                    treeData={fileTree}
                                    onFileSelect={handleFileTreeSelect}
                                    gitStatus={gitStatus}
                                />
                            </div>
                            <div className="resizer" onMouseDown={startResizing}/>
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
                {/* Git 面板 */}
            <GitPanel 
                isVisible={isGitPanelOpen} 
                onClose={() => setIsGitPanelOpen(false)} 
            />
                {/* --- 终端面板 --- */}
                {isTerminalVisible && (
                    <>
                        <div className="terminal-resizer" onMouseDown={startTerminalResize}/>
                        <div className="terminal-panel" style={{height: terminalHeight}}>
                            <TerminalComponent/>
                        </div>
                    </>
                )}
            </div>
            <StatusBar cursorLine={cursorLine} cursorCol={cursorCol}/>
        </div>
    );
}