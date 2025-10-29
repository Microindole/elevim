import React from 'react';
import TreeNode from './TreeNode'; // 我们即将创建这个新组件
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
    return (
        <div className="file-tree-root">
            {/* 从根节点开始渲染 */}
            <TreeNode node={treeData} onFileSelect={onFileSelect} gitStatus={gitStatus} />
        </div>
    );
};

export default FileTree;