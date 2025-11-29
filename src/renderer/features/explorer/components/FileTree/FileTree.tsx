// src/renderer/features/explorer/components/FileTree/FileTree.tsx
import React, { useState } from 'react';
import TreeNode from './TreeNode';
import './FileTree.css';
import { GitStatusMap } from '../../../../../main/lib/git/types';

export interface FileNode {
    name: string;
    path: string;
    children?: FileNode[];
}

interface FileTreeProps {
    treeData: FileNode;
    onFileSelect: (filePath: string) => void;
    gitStatus: GitStatusMap | null;
}

const FileTree: React.FC<FileTreeProps> = ({ treeData, onFileSelect, gitStatus }) => {
    const [activeFile, setActiveFile] = useState<string | null>(null);

    const handleNodeClick = (filePath: string) => {
        setActiveFile(filePath); // 设置当前活动文件
        onFileSelect(filePath); // 调用外部传入的 onFileSelect
    };

    return (
        <div className="file-tree-root">
            <TreeNode
                node={treeData}
                onFileSelect={handleNodeClick}
                gitStatus={gitStatus || {}}
                activeFile={activeFile}
            />
        </div>
    );
};

export default FileTree;