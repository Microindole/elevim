// src/renderer/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
// 其他 imports 保持不变
import TitleBar from './components/TitleBar/TitleBar';
import Editor from './components/Editor/Editor';
import FileTree, { FileNode } from './components/FileTree/FileTree';

import './styles/global.css';
import './components/App/App.css';

export default function App() {
    // --- 状态 ---
    const [isDirty, setIsDirty] = useState(false);
    const [currentFileName, setCurrentFileName] = useState("Untitled");
    const [currentContent, setCurrentContent] = useState("// Welcome to Elevim!\n// Ctrl + Mouse Wheel to zoom.");
    const [fileTree, setFileTree] = useState<FileNode | null>(null);
    const [sidebarWidth, setSidebarWidth] = useState(250);
    const isResizing = useRef(false);
    const contentRef = useRef(currentContent);

    // --- 核心修复 #1: 创建一个 ref 作为“程序化变更”的标志位 ---
    const programmaticChangeRef = useRef(false);

    useEffect(() => {
        contentRef.current = currentContent;
    }, [currentContent]);

    // --- 文件操作逻辑 ---
    const handleSave = useCallback(async () => {
        const savedPath = await window.electronAPI.saveFile(contentRef.current);
        if (savedPath) {
            setCurrentFileName(savedPath.split(/[\\/]/).pop() ?? "Untitled");
            setIsDirty(false); // 保存后，状态是干净的
        }
    }, []);

    const safeAction = useCallback(async (action: () => void) => {
        if (!isDirty) {
            action();
            return;
        }
        const userChoice = await window.electronAPI.showSaveDialog();
        if (userChoice === 'save') {
            await handleSave();
            action();
        } else if (userChoice === 'dont-save') {
            action();
        }
    }, [isDirty, handleSave]);

    const handleNewFile = () => safeAction(() => window.electronAPI.triggerNewFile());
    const handleOpenFile = () => safeAction(() => window.electronAPI.showOpenDialog());
    const handleOpenFolder = async () => {
        const tree = await window.electronAPI.openFolder();
        if (tree) setFileTree(tree);
    };
    const handleSaveAsFile = () => window.electronAPI.triggerSaveAsFile();
    const handleCloseWindow = () => safeAction(() => window.electronAPI.closeWindow());

    // --- 核心修复 #2: 修改回调函数以检查标志位 ---
    const onEditorContentChange = useCallback((doc: string) => {
        setCurrentContent(doc);

        // 如果标志位为 true，说明是程序化变更
        if (programmaticChangeRef.current) {
            // 重置标志位，然后直接返回，不将状态设为“脏”
            programmaticChangeRef.current = false;
            return;
        }

        // 否则，认为是用户输入，将状态设为“脏”
        setIsDirty(true);
    }, []); // 保持空依赖数组，确保函数稳定

    // --- IPC 事件监听 ---
    useEffect(() => {
        const unregisterFileOpen = window.electronAPI.onFileOpen((data) => {
            setCurrentContent(data.content);
            setCurrentFileName(data.filePath.split(/[\\/]/).pop() ?? "Untitled");
            setIsDirty(false); // 打开文件后，状态是干净的
        });

        const unregisterTriggerSave = window.electronAPI.onTriggerSave(handleSave);

        const unregisterNewFile = window.electronAPI.onNewFile(() => {
            setCurrentContent("");
            setCurrentFileName("Untitled");
            setIsDirty(false); // 新建文件后，状态是干净的
        });

        return () => {
            unregisterFileOpen();
            unregisterTriggerSave();
            unregisterNewFile();
        };
    }, [handleSave]);

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
        <>
            <TitleBar
                isDirty={isDirty}
                currentFileName={currentFileName}
                onNewFile={handleNewFile}
                onOpenFile={handleOpenFile}
                onOpenFolder={handleOpenFolder}
                onSaveFile={handleSave}
                onSaveAsFile={handleSaveAsFile}
                onCloseWindow={handleCloseWindow}
            />
            <div className="app-container">
                {fileTree && (
                    <>
                        <div className="sidebar" style={{ width: sidebarWidth }}>
                            <FileTree
                                treeData={fileTree}
                                onFileSelect={(filePath) => safeAction(() => window.electronAPI.openFile(filePath))}
                            />
                        </div>
                        <div className="resizer" onMouseDown={startResizing} />
                    </>
                )}
                <div className="editor-container">
                    <Editor
                        content={currentContent}
                        onDocChange={onEditorContentChange}
                        onSave={handleSave}
                        // --- 核心修复 #3: 将 ref 传递给 Editor 组件 ---
                        programmaticChangeRef={programmaticChangeRef}
                    />
                </div>
            </div>
        </>
    );
}