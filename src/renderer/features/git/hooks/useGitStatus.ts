// src/renderer/features/git/hooks/useGitStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { GitStatusMap } from '../../../../main/lib/git/types';

export function useGitStatus(
    currentOpenFolderPath: React.MutableRefObject<string | null>,
    setFileTree: (tree: any) => void
) {
    const [gitStatus, setGitStatus] = useState<GitStatusMap | null>({});

    // 核心函数：同时刷新 Git 状态 和 文件树结构
    const fetchGitStatus = useCallback(async () => {
        const currentFolder = currentOpenFolderPath.current;
        if (currentFolder) {
            try {
                // 1. 获取最新 Git 状态 (颜色)
                const status = await window.electronAPI.git.getGitStatus();
                setGitStatus(status);

                // 2. [关键修复] 获取最新文件树 (结构)
                const updatedTree = await window.electronAPI.file.readDirectory(currentFolder);
                if (updatedTree) {
                    setFileTree(updatedTree);
                }
            } catch (error) {
                setGitStatus({});
            }
        } else {
            setGitStatus({});
            setFileTree(null);
        }
    }, [currentOpenFolderPath, setFileTree]);

    // 监听 Git 状态变化 (外部文件变动会触发这个)
    useEffect(() => {
        const unsubscribe = window.electronAPI.git.onGitStatusChange(async (status: GitStatusMap | null) => {
            console.log('[Renderer] Git status updated, refreshing tree...');
            setGitStatus(status);

            // [修复] 当收到 Git 变更通知时，强制重新读取目录结构
            // 这样外部新建文件时，文件树才会更新
            if (currentOpenFolderPath.current) {
                const tree = await window.electronAPI.file.readDirectory(currentOpenFolderPath.current);
                if (tree) setFileTree(tree);
            }
        });

        return () => {
            unsubscribe();
            window.electronAPI.git.stopGitWatcher();
        };
    }, [currentOpenFolderPath, setFileTree]); // 添加依赖

    // [修复] 监听 'folder-changed' 自定义事件 (用于内部保存文件后触发)
    useEffect(() => {
        const handleFolderChange = () => {
            console.log('[Renderer] Folder changed event received');
            fetchGitStatus();
        };

        window.addEventListener('folder-changed', handleFolderChange);
        return () => window.removeEventListener('folder-changed', handleFolderChange);
    }, [fetchGitStatus]);

    return {
        gitStatus,
        setGitStatus,
        fetchGitStatus
    };
}