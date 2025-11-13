// src/renderer/hooks/useCliHandlers.ts
import React, { useEffect } from 'react';
import { FileNode } from '../components/FileTree/FileTree';
import { OpenFile } from '../components/Tabs/Tabs';

interface UseCliHandlersProps {
    setFileTree: (tree: FileNode | null) => void;
    currentOpenFolderPath: React.MutableRefObject<string | null>;
    setActiveSidebarView: (view: any) => void;
    setOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>;
    setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
    openFile: (filePath: string, fileContent: string, encoding: string) => void;
}

export function useCliHandlers({
                                   setFileTree,
                                   currentOpenFolderPath,
                                   setActiveSidebarView,
                                   setOpenFiles,
                                   setActiveIndex,
                                   openFile
                               }: UseCliHandlersProps) {
    // 处理从 CLI 打开文件夹
    useEffect(() => {
        const handleOpenFromCli = (tree: FileNode | null) => {
            if (tree) {
                setFileTree(tree);
                currentOpenFolderPath.current = tree.path;

                window.electronAPI.git.stopGitWatcher().then(() => {
                    window.electronAPI.git.startGitWatcher(tree.path);
                });

                window.dispatchEvent(new Event('folder-changed'));
                setActiveSidebarView('explorer');

                setOpenFiles(prev => {
                    if (prev.length === 1 && prev[0].name === "Welcome") {
                        setActiveIndex(0);
                        return [];
                    }
                    return prev;
                });
            }
        };

        const unregister = window.electronAPI.cli.onOpenFolderFromCli(handleOpenFromCli);
        return () => unregister();
    }, [setFileTree, currentOpenFolderPath, setActiveSidebarView, setOpenFiles, setActiveIndex]);

    // 处理从 CLI 打开文件
    useEffect(() => {
        const handleOpenFileFromCli = (data: { content: string; filePath: string }) => {
            setOpenFiles(prev => {
                if (prev.length === 1 && prev[0].name === "Welcome") {
                    const newFile: OpenFile = {
                        path: data.filePath,
                        name: data.filePath.split(/[\\/]/).pop() ?? "Untitled",
                        content: data.content,
                        isDirty: false,
                        encoding: 'UTF-8'
                    };
                    setActiveIndex(0);
                    return [newFile];
                }
                // --- 传递默认编码 ---
                openFile(data.filePath, data.content, 'UTF-8');
                return prev;
            });
        };

        const unregister = window.electronAPI.cli.onOpenFileFromCli(handleOpenFileFromCli);
        return () => unregister();
    }, [openFile, setOpenFiles, setActiveIndex]);

    // 处理从 CLI 打开 Diff
    useEffect(() => {
        // (此函数保持不变)
        const handleOpenDiffFromCli = (filePath: string) => {
            console.log('CLI 请求打开 Diff: ', filePath);
            setActiveSidebarView('git');
            const event = new CustomEvent('open-diff', { detail: filePath });
            window.dispatchEvent(event);
        };

        const unregister = window.electronAPI.cli.onOpenDiffFromCli(handleOpenDiffFromCli);
        return () => unregister();
    }, [setActiveSidebarView]);
}