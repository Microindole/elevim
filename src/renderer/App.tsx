// src/renderer/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import TitleBar from './components/TitleBar/TitleBar';
import Editor from './components/Editor/Editor';
import FileTree, { FileNode } from './components/FileTree/FileTree';
import Tabs, { OpenFile } from './components/Tabs/Tabs';
import StatusBar from './components/StatusBar/StatusBar';

import './components/App/App.css';

const welcomeFile: OpenFile = {
    path: null,
    name: "Welcome",
    content: "// Welcome to Elevim!\n// Use File > Open File... to open a file or folder.",
    isDirty: false
};

export default function App() {
    // --- 状态 ---
    const [openFiles, setOpenFiles] = useState<OpenFile[]>([welcomeFile]);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [fileTree, setFileTree] = useState<FileNode | null>(null);
    const [sidebarWidth, setSidebarWidth] = useState(250);
    const isResizing = useRef(false);
    const programmaticChangeRef = useRef(false);
    const [cursorLine, setCursorLine] = useState(1);
    const [cursorCol, setCursorCol] = useState(1);

    // --- 核心修复 #1: 使用 ref 来跟踪所有需要在稳定回调中访问的状态 ---
    const appStateRef = useRef({ openFiles, activeIndex });
    useEffect(() => {
        appStateRef.current = { openFiles, activeIndex };
    }, [openFiles, activeIndex]);

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
        // 打开文件夹通常被认为是安全操作，可以不检查当前文件
        const tree = await window.electronAPI.openFolder();
        if (tree) setFileTree(tree);
    }, []);
    const handleMenuSaveAsFile = useCallback(() => window.electronAPI.triggerSaveAsFile(), []);
    const handleMenuCloseWindow = useCallback(() => safeAction(() => window.electronAPI.closeWindow()), [safeAction]);
    const handleFileTreeSelect = useCallback((filePath: string) => safeAction(() => window.electronAPI.openFile(filePath)), [safeAction]);
    // 侧边栏拖动逻辑 (保持不变)
    const startResizing = useCallback(() => { isResizing.current = true; }, []);
    const stopResizing = useCallback(() => { isResizing.current = false; }, []);
    const resize = useCallback((e: MouseEvent) => {
        if (isResizing.current) setSidebarWidth(e.clientX);
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <div className="main-layout">
            <TitleBar
                isDirty={activeFile?.isDirty ?? false}
                currentFileName={activeFile?.name ?? "Elevim"}
                onNewFile={handleMenuNewFile}
                onOpenFile={handleMenuOpenFile}
                onOpenFolder={handleMenuOpenFolder}
                onSaveFile={handleSave}
                onSaveAsFile={handleMenuSaveAsFile}
                onCloseWindow={handleMenuCloseWindow}
            /><Tabs files={openFiles} activeIndex={activeIndex} onTabClick={setActiveIndex} onTabClose={handleCloseTab} />
            <div className="app-container">
                {fileTree && (
                    <>
                        <div className="sidebar" style={{ width: sidebarWidth }}>
                            <FileTree treeData={fileTree} onFileSelect={handleFileTreeSelect} />
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
            <StatusBar cursorLine={cursorLine} cursorCol={cursorCol} />
        </div>
    );
}