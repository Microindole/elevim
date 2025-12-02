// src/renderer/features/explorer/components/FileTree/FileTree.tsx
import React, { useState } from 'react';
import TreeNode from './TreeNode';
import './FileTree.css';
import { GitStatusMap } from '../../../../../main/lib/git/types';
import ContextMenu from '../../../../../shared/components/ContextMenu/ContextMenu';
import { useFileTree } from '../../hooks/useFileTree';
import RenameModal from './RenameModal'; // [新增] 导入模态框

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

    // 右键菜单状态
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, path: string} | null>(null);

    // [新增] 重命名模态框状态 (存储要重命名的文件路径)
    const [renameTarget, setRenameTarget] = useState<string | null>(null);

    // 获取重命名逻辑
    const { performRename } = useFileTree();

    const handleNodeClick = (filePath: string) => {
        setActiveFile(filePath);
        onFileSelect(filePath);
    };

    const handleContextMenu = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, path });
    };

    // [新增] 处理重命名确认
    const handleRenameConfirm = (newName: string) => {
        if (renameTarget) {
            performRename(renameTarget, newName);
        }
        setRenameTarget(null); // 关闭模态框
    };

    return (
        <div className="file-tree-root" onContextMenu={(e) => e.preventDefault()}>
            <TreeNode
                node={treeData}
                onFileSelect={handleNodeClick}
                onContextMenu={handleContextMenu}
                gitStatus={gitStatus || {}}
                activeFile={activeFile}
            />

            {/* 右键菜单 */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={[
                        {
                            label: 'Rename (Auto-update Links)',
                            onClick: () => {
                                setRenameTarget(contextMenu.path); // 触发模态框打开
                                // 注意：这里不要立即 setContextMenu(null)，
                                // ContextMenu 组件的 onClick 内部通常会调用 onClose
                            }
                        },
                    ]}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* [新增] 重命名模态框 */}
            {renameTarget && (
                <RenameModal
                    initialName={renameTarget.split(/[\\/]/).pop() || ""}
                    onConfirm={handleRenameConfirm}
                    onClose={() => setRenameTarget(null)}
                />
            )}
        </div>
    );
};

export default FileTree;