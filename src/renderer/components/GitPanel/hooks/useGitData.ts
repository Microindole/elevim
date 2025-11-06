// src/renderer/components/GitPanel/hooks/useGitData.ts
import { useState, useEffect, useCallback } from 'react';
import { GitFileChange, GitBranch, GitCommit } from '../../../../main/lib/git-service';

const APP_EVENTS = {
    FOLDER_CHANGED: 'folder-changed',
    GIT_BRANCH_CHANGED: 'git-branch-changed',
} as const;

export const useGitData = () => {
    const [changes, setChanges] = useState<GitFileChange[]>([]);
    const [branches, setBranches] = useState<GitBranch[]>([]);
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [currentBranch, setCurrentBranch] = useState<string | null>(null);

    const loadChanges = useCallback(async () => {
        const result = await window.electronAPI.gitGetChanges();
        setChanges(result);
    }, []);

    const loadBranches = useCallback(async () => {
        const result = await window.electronAPI.gitGetBranches();
        setBranches(result);
        const current = await window.electronAPI.gitGetCurrentBranch();
        setCurrentBranch(current);
    }, []);

    const loadCommits = useCallback(async () => {
        const result = await window.electronAPI.gitGetCommits(50);
        setCommits(result);
    }, []);

    const loadAll = useCallback(() => {
        loadChanges();
        loadBranches();
        loadCommits();
    }, [loadChanges, loadBranches, loadCommits]);

    // 初始加载
    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // Git 状态变化监听
    useEffect(() => {
        const unsubscribe = window.electronAPI.onGitStatusChange(() => {
            loadChanges();
        });
        return unsubscribe;
    }, [loadChanges]);

    // 文件夹变化监听
    useEffect(() => {
        window.addEventListener(APP_EVENTS.FOLDER_CHANGED, loadAll);
        return () => window.removeEventListener(APP_EVENTS.FOLDER_CHANGED, loadAll);
    }, [loadAll]);

    return {
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