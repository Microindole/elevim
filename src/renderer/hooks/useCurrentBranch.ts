// src/renderer/hooks/useCurrentBranch.ts
import { useState, useEffect, useCallback } from 'react';

const APP_EVENTS = {
    FOLDER_CHANGED: 'folder-changed',
    GIT_BRANCH_CHANGED: 'git-branch-changed',
} as const;

/**
 * 一个专门用于跟踪当前 Git 分支的 Hook。
 * @param folderPath 当前打开的文件夹路径 (来自 currentOpenFolderPath.current)
 */
export function useCurrentBranch(folderPath: string | null) {
    const [currentBranch, setCurrentBranch] = useState<string | null>(null);

    const fetchBranch = useCallback(async () => {
        if (folderPath) {
            try {
                // 调用您已有的 IPC 处理器
                const branch = await window.electronAPI.git.gitGetCurrentBranch();
                setCurrentBranch(branch);
            } catch (e) {
                console.error("[useCurrentBranch] Failed to fetch branch", e);
                setCurrentBranch(null);
            }
        } else {
            setCurrentBranch(null); // 没有打开文件夹，就没有分支
        }
    }, [folderPath]);

    // 1. 当文件夹路径变化时，获取分支
    useEffect(() => {
        fetchBranch();
    }, [fetchBranch]);

    // 2. 监听自定义事件，以便在分支切换或文件夹加载时刷新
    useEffect(() => {
        window.addEventListener(APP_EVENTS.FOLDER_CHANGED, fetchBranch);
        window.addEventListener(APP_EVENTS.GIT_BRANCH_CHANGED, fetchBranch);

        return () => {
            window.removeEventListener(APP_EVENTS.FOLDER_CHANGED, fetchBranch);
            window.removeEventListener(APP_EVENTS.GIT_BRANCH_CHANGED, fetchBranch);
        };
    }, [fetchBranch]);

    return currentBranch;
}