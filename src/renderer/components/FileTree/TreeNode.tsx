import React, { useState } from 'react';
import { FileNode } from './FileTree';
import { GitStatusMap } from '../../../main/lib/git/types';
import { getIcon } from './icon-map';

interface TreeNodeProps {
    node: FileNode;
    onFileSelect: (filePath: string) => void;
    gitStatus: GitStatusMap;
    activeFile: string | null;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, onFileSelect, gitStatus, activeFile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isDirectory = !!node.children;

    const handleToggle = () => {
        if (isDirectory) {
            setIsOpen(!isOpen);
        } else {
            onFileSelect(node.path);
        }
    };

    // 🔧 修复：标准化路径进行匹配
    const getGitStatusForNode = () => {
        // 1. 直接匹配（如果恰好一致）
        if (gitStatus[node.path]) {
            return gitStatus[node.path];
        }

        // 2. 标准化路径后匹配
        // 将 node.path 转换为 Windows 格式（如果需要）
        const normalizedNodePath = node.path.replace(/\//g, '\\');

        // 在所有 gitStatus 的 key 中查找匹配的
        for (const [gitPath, status] of Object.entries(gitStatus)) {
            // 如果 gitPath 以 node.path 结尾（处理相对路径 vs 绝对路径的情况）
            if (gitPath.endsWith(normalizedNodePath) || gitPath.endsWith(node.path)) {
                return status;
            }
        }

        return '';
    };

    const currentGitStatus = getGitStatusForNode();
    const gitStatusClassName = currentGitStatus ? `git-${currentGitStatus}` : '';
    const { iconPath } = getIcon(node.name, isDirectory, isOpen);
    const isActive = activeFile === node.path;
    const nodePathWithSlash = isDirectory ? `${node.path}/` : node.path;
    const isAncestorOfActive = activeFile ? activeFile.startsWith(nodePathWithSlash) : false;

    const childrenClass = [
        'node-children',
        (isAncestorOfActive || isActive) && 'active-ancestor'
    ].filter(Boolean).join(' ');

    return (
        <div className="tree-node">
            <div className="node-content" onClick={handleToggle}>
                {isDirectory ? (
                    <span className={`caret ${isOpen ? 'caret-open' : ''}`}></span>
                ) : (
                    <span className="caret-placeholder"></span>
                )}
                <span className="icon">
                    <img
                        src={iconPath}
                        alt=""
                        className="file-icon"
                    />
                </span>
                <span className={`node-name ${gitStatusClassName}`}>{node.name}</span>
            </div>
            {isOpen && isDirectory && (
                <div className={childrenClass}>
                    {node.children?.map(childNode => (
                        <TreeNode
                            key={childNode.path}
                            node={childNode}
                            onFileSelect={onFileSelect}
                            gitStatus={gitStatus}
                            activeFile={activeFile}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TreeNode;