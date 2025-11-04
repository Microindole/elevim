// src/renderer/hooks/useFileTree.ts
import { useState, useCallback, useRef } from 'react';
import { FileNode } from '../components/FileTree/FileTree';

export function useFileTree() {
    const [fileTree, setFileTree] = useState<FileNode | null>(null);
    const currentOpenFolderPath = useRef<string | null>(null);

    const handleMenuOpenFolder = useCallback(async () => {
        const tree = await window.electronAPI.openFolder();
        if (tree) {
            setFileTree(tree);
            currentOpenFolderPath.current = tree.path;

            await window.electronAPI.stopGitWatcher();
            await window.electronAPI.startGitWatcher(tree.path);

            window.dispatchEvent(new Event('folder-changed'));
            return tree;
        } else {
            currentOpenFolderPath.current = null;
            await window.electronAPI.stopGitWatcher();
            return null;
        }
    }, []);

    const handleFileTreeSelect = useCallback((filePath: string, safeAction: (action: () => void) => void) => {
        safeAction(() => window.electronAPI.openFile(filePath));
    }, []);

    return {
        fileTree,
        setFileTree,
        currentOpenFolderPath,
        handleMenuOpenFolder,
        handleFileTreeSelect
    };
}