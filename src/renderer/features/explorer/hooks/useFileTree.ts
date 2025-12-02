// src/renderer/features/explorer/hooks/useFileTree.ts
import { useState, useCallback, useRef } from 'react';
import { FileNode } from '../components/FileTree/FileTree';

export function useFileTree() {
    const [fileTree, setFileTree] = useState<FileNode | null>(null);
    const currentOpenFolderPath = useRef<string | null>(null);

    const handleMenuOpenFolder = useCallback(async () => {
        const tree = await window.electronAPI.file.openFolder();
        if (tree) {
            setFileTree(tree);
            currentOpenFolderPath.current = tree.path;

            await window.electronAPI.git.stopGitWatcher();
            await window.electronAPI.git.startGitWatcher(tree.path);

            window.dispatchEvent(new Event('folder-changed'));
            return tree;
        } else {
            currentOpenFolderPath.current = null;
            await window.electronAPI.git.stopGitWatcher();
            return null;
        }
    }, []);

    const handleFileTreeSelect = useCallback((filePath: string, safeAction: (action: () => void) => void) => {
        safeAction(() => { window.electronAPI.file.openFile(filePath); });
    }, []);

    // [重命名核心逻辑]
    const performRename = useCallback(async (oldPath: string, newName: string) => {
        const oldName = oldPath.split(/[\\/]/).pop();
        if (!oldName || newName === oldName) return;

        if (newName.includes('/') || newName.includes('\\')) {
            alert("File name cannot contain slashes.");
            return;
        }

        const newPath = oldPath.substring(0, oldPath.lastIndexOf(oldName)) + newName;

        // 调用 API
        // @ts-ignore
        const result = await window.electronAPI.file.renameFile(oldPath, newPath);

        if (result.success) {
            console.log(`Renamed successfully. Updated ${result.modifiedCount} files.`);

            // 1. 通知文件树刷新
            window.dispatchEvent(new Event('folder-changed'));

            // 2. 广播具体的重命名事件，携带被修改的文件列表
            const event = new CustomEvent('file-renamed', {
                detail: {
                    oldPath,
                    newPath,
                    modifiedPaths: result.modifiedPaths || []
                }
            });
            window.dispatchEvent(event);

            if (result.modifiedCount > 0) {
                // alert(`Renamed and updated ${result.modifiedCount} files.`);
            }
        } else {
            alert(`Rename failed: ${result.error}`);
        }
    }, []);

    return {
        fileTree,
        setFileTree,
        currentOpenFolderPath,
        handleMenuOpenFolder,
        handleFileTreeSelect,
        performRename,
    };
}