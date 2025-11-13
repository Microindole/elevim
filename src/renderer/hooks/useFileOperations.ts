// src/renderer/hooks/useFileOperations.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { OpenFile } from '../components/Tabs/Tabs';

const welcomeFile: OpenFile = {
    path: null,
    name: "Welcome",
    content: "// Welcome to Elevim!\n// Use File > Open File... to open a file or folder.",
    isDirty: false,
    encoding: 'UTF-8'
};

export function useFileOperations() {
    const [openFiles, setOpenFiles] = useState<OpenFile[]>([welcomeFile]);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [cursorLine, setCursorLine] = useState(1);
    const [cursorCol, setCursorCol] = useState(1);
    const programmaticChangeRef = useRef(false);
    const [jumpToLine, setJumpToLine] = useState<{ path: string | null, line: number } | null>(null);
    const appStateRef = useRef({ openFiles, activeIndex });

    const activeFile = openFiles[activeIndex];

    useEffect(() => {
        appStateRef.current = { openFiles, activeIndex };
    }, [openFiles, activeIndex]);

    const openFile = useCallback((
        filePath: string,
        fileContent: string,
        encoding: string,
        line?: number
    ) => {
        setOpenFiles(prevFiles => {
            // 关闭欢迎页
            if (prevFiles.length === 1 && prevFiles[0].name === "Welcome") {
                const newFile: OpenFile = {
                    path: filePath,
                    name: filePath.split(/[\\/]/).pop() ?? "Untitled",
                    content: fileContent,
                    isDirty: false,
                    encoding: encoding // <-- 存储 encoding
                };
                setActiveIndex(0);
                if (line) {
                    setJumpToLine({ path: filePath, line: line });
                }
                return [newFile];
            }

            // 检查是否已打开
            const alreadyOpenIndex = prevFiles.findIndex(f => f.path === filePath);
            if (alreadyOpenIndex > -1) {
                setActiveIndex(alreadyOpenIndex);
                if (line) {
                    setJumpToLine({ path: filePath, line: line });
                }
                // (可选) 也许我们应该在这里更新内容和编码？
                // 暂时保持简单，只切换
                return prevFiles;
            } else {
                // 添加新文件
                const newFile: OpenFile = {
                    path: filePath,
                    name: filePath.split(/[\\/]/).pop() ?? "Untitled",
                    content: fileContent,
                    isDirty: false,
                    encoding: encoding
                };
                setActiveIndex(prevFiles.length);
                if (line) {
                    setJumpToLine({ path: filePath, line: line });
                }
                return [...prevFiles, newFile];
            }
        });
    }, []);

    const handleSave = useCallback(async () => {
        const { openFiles, activeIndex } = appStateRef.current;
        const currentActiveFile = openFiles[activeIndex];
        if (!currentActiveFile || currentActiveFile.name === "Welcome") return;

        const savedPath = await window.electronAPI.file.saveFile(currentActiveFile.content);
        if (savedPath) {
            setOpenFiles(prev => prev.map((file, index) => {
                if (index === appStateRef.current.activeIndex) {
                    return {
                        ...file,
                        path: savedPath,
                        name: savedPath.split(/[\\/]/).pop() ?? "Untitled",
                        isDirty: false
                    };
                }
                return file;
            }));
        }
    }, []);

    const safeAction = useCallback(async (action: () => void) => {
        const { openFiles, activeIndex } = appStateRef.current;
        const fileToCheck = openFiles[activeIndex];

        if (!fileToCheck || !fileToCheck.isDirty || fileToCheck.name === "Welcome") {
            action();
            return;
        }

        const choice = await window.electronAPI.window.showSaveDialog();

        if (choice === 'save') {
            await handleSave();
            action();
        } else if (choice === 'dont-save') {
            action();
        }
    }, [handleSave]);

    const handleNewFile = useCallback(() => {
        const newFile: OpenFile = {
            path: null,
            name: "Untitled",
            content: "",
            isDirty: false,
            encoding: 'UTF-8'
        };
        setOpenFiles(prev => {
            setActiveIndex(prev.length);
            return [...prev, newFile];
        });
    }, []);

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
                if (currentActiveIndex >= indexToClose && currentActiveIndex > 0) {
                    setActiveIndex(prev => prev - 1);
                }
                return newFiles;
            });
        };

        if (appStateRef.current.activeIndex !== indexToClose) {
            (async () => {
                if (!fileToClose.isDirty) {
                    closeAction();
                    return;
                }
                const choice = await window.electronAPI.window.showSaveDialog();
                if (choice === 'save') {
                    await window.electronAPI.file.saveFile(fileToClose.content);
                    closeAction();
                } else if (choice === 'dont-save') {
                    closeAction();
                }
            })();
        } else {
            safeAction(closeAction);
        }
    }, [safeAction]);

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
    }, []);

    const handleCursorChange = useCallback((line: number, col: number) => {
        setCursorLine(line);
        setCursorCol(col);
    }, []);

    return {
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
    };
}