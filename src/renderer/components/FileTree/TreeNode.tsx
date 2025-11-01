// src/renderer/components/FileTree/TreeNode.tsx
import React, { useState } from 'react';
import { FileNode } from './FileTree';
import { GitStatusMap } from '../../../main/lib/git-service';
import { getIcon } from './icon-map';

interface TreeNodeProps {
    node: FileNode;
    onFileSelect: (filePath: string) => void;
    gitStatus: GitStatusMap;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, onFileSelect, gitStatus }) => {
    const [isOpen, setIsOpen] = useState(false);

    const isDirectory = !!node.children;

    const handleToggle = () => {
        if (isDirectory) {
            setIsOpen(!isOpen);
        } else {
            onFileSelect(node.path);
        }
    };

    const currentGitStatus = gitStatus[node.path] || '';
    const gitStatusClassName = currentGitStatus ? `git-${currentGitStatus}` : '';

    // 获取图标路径
    const { iconPath } = getIcon(node.name, isDirectory, isOpen);

    return (
        <div className="tree-node">
            <div className="node-content" onClick={handleToggle}>
                {isDirectory ? (
                    <span className={`caret ${isOpen ? 'caret-open' : ''}`}></span>
                ) : (
                    <span className="caret-placeholder"></span>
                )}
                <span className="icon">
                    {/* 使用 img 标签渲染 vscode-icons。
                      移除内联 style，让 CSS 来控制它。
                    */}
                    <img
                        src={iconPath}
                        alt=""
                        className="file-icon" // 【新】添加一个 class
                    />
                </span>
                <span className={`node-name ${gitStatusClassName}`}>{node.name}</span>
            </div>
            {isOpen && isDirectory && (
                <div className="node-children">
                    {node.children?.map(childNode => (
                        <TreeNode
                            key={childNode.path}
                            node={childNode}
                            onFileSelect={onFileSelect}
                            gitStatus={gitStatus}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TreeNode;