// src/renderer/hooks/useBranchChange.ts
import { useEffect } from 'react';
import { OpenFile } from '../components/Tabs/Tabs';
import { GitStatusMap } from '../../main/lib/git-service';

interface UseBranchChangeProps {
    currentOpenFolderPath: React.MutableRefObject<string | null>;
    setFileTree: (tree: any) => void;
    setGitStatus: (status: GitStatusMap) => void;
    openFiles: OpenFile[];
    activeIndex: number;
    setOpenFiles: React.Dispatch<React.SetStateAction<OpenFile[]>>;
}

export function useBranchChange({
                                    currentOpenFolderPath,
                                    setFileTree,
                                    setGitStatus,
                                    openFiles,
                                    activeIndex,
                                    setOpenFiles
                                }: UseBranchChangeProps) {
    useEffect(() => {
        const handleBranchChange = async () => {
            if (currentOpenFolderPath.current) {
                // 重新读取文件树
                const updatedTree = await window.electronAPI.file.readDirectory( // MODIFIED
                    currentOpenFolderPath.current
                );
                if (updatedTree) {
                    setFileTree(updatedTree);
                }

                // 刷新 Git 状态
                const newStatus = await window.electronAPI.git.getGitStatus(); // MODIFIED
                setGitStatus(newStatus);

                // 可选：重新加载当前打开的文件
                const currentFile = openFiles[activeIndex];
                if (currentFile?.path) {
                    const content = await window.electronAPI.file.openFile(currentFile.path); // MODIFIED
                    if (content !== null) {
                        setOpenFiles(prev => prev.map((f, i) =>
                            i === activeIndex ? { ...f, content, isDirty: false } : f
                        ));
                    }
                }
            }
        };

        window.addEventListener('git-branch-changed', handleBranchChange);
        return () => window.removeEventListener('git-branch-changed', handleBranchChange);
    }, [currentOpenFolderPath, setFileTree, setGitStatus, openFiles, activeIndex, setOpenFiles]);
}