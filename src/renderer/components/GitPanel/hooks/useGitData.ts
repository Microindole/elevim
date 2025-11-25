// src/renderer/components/GitPanel/hooks/useGitData.ts
import { useState, useEffect, useCallback } from 'react';
import { GitFileChange, GitBranch, GitCommit, GitStatusMap } from '../../../../main/lib/git/types';

const APP_EVENTS = {
    FOLDER_CHANGED: 'folder-changed',
    GIT_BRANCH_CHANGED: 'git-branch-changed',
} as const;

export const useGitData = () => {
    const [repoExists, setRepoExists] = useState(true);
    const [hasRemote, setHasRemote] = useState(false);
    const [changes, setChanges] = useState<GitFileChange[]>([]);
    const [branches, setBranches] = useState<GitBranch[]>([]);
    const [currentBranch, setCurrentBranch] = useState<string | null>(null);

    // --- 提交历史状态 ---
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [hasMoreCommits, setHasMoreCommits] = useState(true);
    const [isLoadingCommits, setIsLoadingCommits] = useState(false);

    const loadChanges = useCallback(async () => {
        const result = await window.electronAPI.git.gitGetChanges();
        setChanges(result);
    }, []);

    const loadBranches = useCallback(async () => {
        const result = await window.electronAPI.git.gitGetBranches();
        setBranches(result);
        const current = await window.electronAPI.git.gitGetCurrentBranch();
        setCurrentBranch(current);
    }, []);

    // 1. 初始加载提交
    const loadCommits = useCallback(async () => {
        setIsLoadingCommits(true);
        try {
            const result = await window.electronAPI.git.gitGetCommits(50, 0);
            setCommits(result);
            setHasMoreCommits(result.length === 50);
        } finally {
            setIsLoadingCommits(false);
        }
    }, []);

    // 2. 加载更多提交
    const loadMoreCommits = useCallback(async () => {
        if (isLoadingCommits || !hasMoreCommits) return;

        setIsLoadingCommits(true);
        try {
            const currentLength = commits.length;
            const result = await window.electronAPI.git.gitGetCommits(50, currentLength);

            setCommits(prev => [...prev, ...result]);
            if (result.length < 50) {
                setHasMoreCommits(false);
            }
        } catch (e) {
            console.error("Failed to load more commits", e);
        } finally {
            setIsLoadingCommits(false);
        }
    }, [commits.length, hasMoreCommits, isLoadingCommits]);

    const loadRemotes = useCallback(async () => {
        const remotes = await window.electronAPI.git.gitGetRemotes();
        setHasRemote(remotes.length > 0);
    }, []);

    const loadAll = useCallback(() => {
        window.electronAPI.git.getGitStatus().then(status => {
            if (status === null) {
                setRepoExists(false);
                setChanges([]);
                setBranches([]);
                setCommits([]);
                setCurrentBranch(null);
                setHasRemote(false);
            } else {
                setRepoExists(true);
                setHasRemote(true);
                loadChanges();
                loadBranches();
                loadCommits(); // 初始加载
                loadRemotes();
            }
        });
    }, [loadChanges, loadBranches, loadCommits, loadRemotes]);

    // 初始加载
    useEffect(() => {
        loadAll();
    }, [loadAll]);

    // Git 状态变化监听
    useEffect(() => {
        const unsubscribe = window.electronAPI.git.onGitStatusChange((status: GitStatusMap | null) => {
            if (status === null) {
                setRepoExists(false);
                setChanges([]);
                setBranches([]);
                setCommits([]);
                setCurrentBranch(null);
                setHasRemote(false);
            } else {
                setRepoExists(true);
                loadChanges();
                loadRemotes();
                // 注意：Git 状态变化（如文件修改）通常不需要刷新整个 Commit 历史，除非发生了 Commit。
                // 如果你希望每次变动都刷新历史，可以在这里调用 loadCommits()，但要注意性能。
                // 通常只需在 commit 操作成功后刷新历史即可（在 useGitOperations 里处理）。
            }
        });
        return unsubscribe;
    }, [loadChanges, loadRemotes]);

    // 文件夹变化监听
    useEffect(() => {
        window.addEventListener(APP_EVENTS.FOLDER_CHANGED, loadAll);
        return () => window.removeEventListener(APP_EVENTS.FOLDER_CHANGED, loadAll);
    }, [loadAll]);

    return {
        repoExists,
        hasRemote,
        changes,
        branches,
        commits,
        currentBranch,
        hasMoreCommits,
        isLoadingCommits,
        loadMoreCommits,
        loadChanges,
        loadBranches,
        loadCommits,
        loadAll,
    };
};