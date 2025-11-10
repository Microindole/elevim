// src/renderer/components/GitPanel/hooks/useGitData.ts
import { useState, useEffect, useCallback } from 'react';
import { GitFileChange, GitBranch, GitCommit, GitStatusMap } from '../../../../main/lib/git/types';

const APP_EVENTS = {
    FOLDER_CHANGED: 'folder-changed',
    GIT_BRANCH_CHANGED: 'git-branch-changed',
} as const;

export const useGitData = () => {
    const [repoExists, setRepoExists] = useState(true);
    const [changes, setChanges] = useState<GitFileChange[]>([]);
    const [branches, setBranches] = useState<GitBranch[]>([]);
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [currentBranch, setCurrentBranch] = useState<string | null>(null);

    const loadChanges = useCallback(async () => {
        const result = await window.electronAPI.git.gitGetChanges(); // MODIFIED
        setChanges(result);
    }, []);

    const loadBranches = useCallback(async () => {
        const result = await window.electronAPI.git.gitGetBranches(); // MODIFIED
        setBranches(result);
        const current = await window.electronAPI.git.gitGetCurrentBranch(); // MODIFIED
        setCurrentBranch(current);
    }, []);

    const loadCommits = useCallback(async () => {
        const result = await window.electronAPI.git.gitGetCommits(50); // MODIFIED
        setCommits(result);
    }, []);

    const loadAll = useCallback(() => {
        // 立即检查状态，以防万一
        window.electronAPI.git.getGitStatus().then(status => {
            if (status === null) {
                setRepoExists(false);
                setChanges([]);
                setBranches([]);
                setCommits([]);
                setCurrentBranch(null);
            } else {
                setRepoExists(true);
                // 仅在仓库存在时加载
                loadChanges();
                loadBranches();
                loadCommits();
            }
        });
    }, [loadChanges, loadBranches, loadCommits]);

    // 初始加载
    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // Git 状态变化监听
    useEffect(() => {
        const unsubscribe = window.electronAPI.git.onGitStatusChange((status: GitStatusMap | null) => { // <--- 修改
            if (status === null) {
                // 仓库不存在 (例如刚打开文件夹)
                setRepoExists(false);
                setChanges([]);
                setBranches([]);
                setCommits([]);
                setCurrentBranch(null);
            } else {
                // 仓库存在 (可能是刚 init，或文件发生变化)
                setRepoExists(true);
                loadChanges(); // 重新加载变更
            }
        });
        return unsubscribe;
    }, [loadChanges]);

    // 文件夹变化监听
    useEffect(() => {
        window.addEventListener(APP_EVENTS.FOLDER_CHANGED, loadAll);
        return () => window.removeEventListener(APP_EVENTS.FOLDER_CHANGED, loadAll);
    }, [loadAll]);

    return {
        repoExists,
        changes,
        branches,
        commits,
        currentBranch,
        loadChanges,
        loadBranches,
        loadCommits,
        loadAll,
    };
};