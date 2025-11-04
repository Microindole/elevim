// src/renderer/hooks/useGitStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { GitStatusMap } from '../../main/lib/git-service';

export function useGitStatus(
    currentOpenFolderPath: React.MutableRefObject<string | null>,
    setFileTree: (tree: any) => void
) {
    const [gitStatus, setGitStatus] = useState<GitStatusMap>({});

    const fetchGitStatus = useCallback(async () => {
        const currentFolder = currentOpenFolderPath.current;
        if (currentFolder) {
            try {
                const status = await window.electronAPI.getGitStatus();
                setGitStatus(status);

                const updatedTree = await window.electronAPI.readDirectory(currentFolder);
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
        const unsubscribe = window.electronAPI.onGitStatusChange((status: GitStatusMap) => {
            console.log('[Renderer] Git status updated');
            setGitStatus(status);
        });

        return () => {
            unsubscribe();
            window.electronAPI.stopGitWatcher();
        };
    }, []);

    return {
        gitStatus,
        setGitStatus,
        fetchGitStatus
    };
}