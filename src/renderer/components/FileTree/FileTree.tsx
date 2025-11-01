// src/renderer/components/FileTree/FileTree.tsx
import React, { useState } from 'react';
import TreeNode from './TreeNode';
import './FileTree.css';
import { GitStatusMap } from '../../../main/lib/git-service';

export interface FileNode {
    name: string;
    path: string;
    children?: FileNode[];
}

interface FileTreeProps {
    treeData: FileNode; // 我们现在只接收根节点
    onFileSelect: (filePath: string) => void;
    gitStatus: GitStatusMap;
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
                onFileSelect={handleNodeClick} // 3. 使用新的处理器
                gitStatus={gitStatus}
                activeFile={activeFile} // 4. 将 activeFile 状态传递下去
            />
        </div>
    );
};

export default FileTree;