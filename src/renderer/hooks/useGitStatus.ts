// src/renderer/hooks/useGitStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { GitStatusMap } from '../../main/lib/git-service';

export function useGitStatus(
    currentOpenFolderPath: React.MutableRefObject<string | null>,
    setFileTree: (tree: any) => void
) {
    const [gitStatus, setGitStatus] = useState<GitStatusMap | null>({});

    const fetchGitStatus = useCallback(async () => {
        const currentFolder = currentOpenFolderPath.current;
        if (currentFolder) {
            try {
                const status = await window.electronAPI.git.getGitStatus(); // MODIFIED
                setGitStatus(status);

                const updatedTree = await window.electronAPI.file.readDirectory(currentFolder); // MODIFIED
                if (updatedTree) {
                    console.log("Directory structure updated.");
                    setFileTree(updatedTree);
                } else {
                    console.warn("Failed to refresh directory structure.");
                }
            } catch (error) {
                setGitStatus({});
            }
        } else {
            setGitStatus({});
            setFileTree(null);
        }
    }, [currentOpenFolderPath, setFileTree]);

    useEffect(() => {
        const unsubscribe = window.electronAPI.git.onGitStatusChange((status: GitStatusMap | null) => { // MODIFIED
            console.log('[Renderer] Git status updated');
            setGitStatus(status);
        });

        return () => {
            unsubscribe();
            window.electronAPI.git.stopGitWatcher(); // MODIFIED
        };
    }, []);

    return {
        gitStatus,
        setGitStatus,
        fetchGitStatus
    };
}