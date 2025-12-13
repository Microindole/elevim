// src/renderer-markdown/hooks/useWriterFile.ts
import { useState, useEffect, useCallback } from 'react';

export function useWriterFile() {
    const [content, setContent] = useState<string>('# 无标题\n\n开始写作...');
    const [filePath, setFilePath] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // 1. 监听主进程的“打开文件”事件
    useEffect(() => {
        // 监听菜单/CLI 触发的打开文件
        const removeOpenListener = window.electronAPI.file.onFileOpen((data) => {
            setContent(data.content);
            setFilePath(data.filePath);
            setIsDirty(false);
            // 更新窗口标题
            document.title = data.filePath ? `${data.filePath} - Elevim Writer` : 'Elevim Writer';
        });

        // 监听“新建文件”
        const removeNewListener = window.electronAPI.file.onNewFile(() => {
            setContent('');
            setFilePath(null);
            setIsDirty(false);
        });

        return () => {
            removeOpenListener();
            removeNewListener();
        };
    }, []);

    // 2. 保存文件的核心逻辑
    const saveFile = useCallback(async () => {
        // 如果是新文件，或者需要另存为（这里简化逻辑，通常另存为是单独的）
        const path = filePath;

        // 调用主进程 API 保存
        const savedPath = await window.electronAPI.file.saveFile(path, content);

        if (savedPath) {
            setFilePath(savedPath);
            setIsDirty(false);
            document.title = `${savedPath} - Elevim Writer`;
            console.log('Saved to:', savedPath);
        }
    }, [content, filePath]);

    // 3. 监听快捷键 (Ctrl+S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveFile();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [saveFile]);

    // 4. 监听菜单栏的保存触发器
    useEffect(() => {
        const removeSaveListener = window.electronAPI.menu.onTriggerSave(() => {
            saveFile();
        });
        return removeSaveListener;
    }, [saveFile]);

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        if (!isDirty) {
            setIsDirty(true);
            document.title = `* ${document.title}`;
        }
    };

    return {
        content,
        filePath,
        isDirty,
        handleContentChange,
        saveFile
    };
}