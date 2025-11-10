// src/renderer/hooks/useFileTree.ts
import { useState, useCallback, useRef } from 'react';
import { FileNode } from '../components/FileTree/FileTree';

export function useFileTree() {
    const [fileTree, setFileTree] = useState<FileNode | null>(null);
    const currentOpenFolderPath = useRef<string | null>(null);

    const handleMenuOpenFolder = useCallback(async () => {
        const tree = await window.electronAPI.file.openFolder(); // MODIFIED
        if (tree) {
            setFileTree(tree);
            currentOpenFolderPath.current = tree.path;

            await window.electronAPI.git.stopGitWatcher(); // MODIFIED
            await window.electronAPI.git.startGitWatcher(tree.path); // MODIFIED

            window.dispatchEvent(new Event('folder-changed'));
            return tree;
        } else {
            currentOpenFolderPath.current = null;
            await window.electronAPI.git.stopGitWatcher(); // MODIFIED
            return null;
        }
    }, []);

    const handleFileTreeSelect = useCallback((filePath: string, safeAction: (action: () => void) => void) => {
        safeAction(() => { window.electronAPI.file.openFile(filePath); }); // MODIFIED
    }, []);

    return {
        fileTree,
        setFileTree,
        currentOpenFolderPath,
        handleMenuOpenFolder,
        handleFileTreeSelect
    };
}