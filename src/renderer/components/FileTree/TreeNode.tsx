import React, { useState } from 'react';
import { FileNode } from './FileTree';
import { GitStatusMap } from '../../../main/lib/git-service';

// 定义一些简单的 SVG 图标
const FolderIcon = () => (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6h6l2 2h8v10H4V6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const FileIcon = () => (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 2v6h6M10 22h4c5 0 7-2 7-7V9c0-5-2-7-7-7H7C2 2 0 4 0 9v6c0 5 2 7 7 7z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

interface TreeNodeProps {
    node: FileNode;
    onFileSelect: (filePath: string) => void;
    gitStatus: GitStatusMap;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, onFileSelect, gitStatus }) => {
    // 1. 使用 useState 来追踪每个文件夹自己的展开/折叠状态
    const [isOpen, setIsOpen] = useState(false);

    const isDirectory = !!node.children;

    // 2. 点击时切换状态的函数
    const handleToggle = () => {
        if (isDirectory) {
            setIsOpen(!isOpen);
        } else {
            onFileSelect(node.path);
        }
    };

    // --- 获取当前文件的 Git 状态 ---
    const currentGitStatus = gitStatus[node.path] || ''; // 获取状态，没有则为空字符串
    // --- 根据状态生成 CSS 类名 ---
    const gitStatusClassName = currentGitStatus ? `git-${currentGitStatus}` : ''; // 例如 "git-modified"

    return (
        <div className="tree-node">
            <div className="node-content" onClick={handleToggle}>
                {isDirectory && (
                    // 这是一个小三角，根据 isOpen 状态旋转
                    <span className={`caret ${isOpen ? 'caret-open' : ''}`}>▶</span>
                )}
                <span className="icon">
                    {isDirectory ? <FolderIcon /> : <FileIcon />}
                </span>
                <span className={`node-name ${gitStatusClassName}`}>{node.name}</span>
            </div>
            {/* 3. 如果是展开状态并且有子节点，则递归渲染子节点 */}
            {isOpen && isDirectory && (
                <div className="node-children">
                    {node.children?.map(childNode => (
                        <TreeNode
                            key={childNode.path}
                            node={childNode}
                            onFileSelect={onFileSelect}
                            gitStatus={gitStatus} // <--- 传递给子节点
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TreeNode;