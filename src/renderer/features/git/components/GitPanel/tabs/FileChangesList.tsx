// src/renderer/features/git/components/GitPanel/tabs/FileChangesList.tsx
import React, { useState } from 'react';
import { GitFileChange } from '../../../../../../main/lib/git/types';
import ContextMenu from '../../../../../../shared/components/ContextMenu/ContextMenu';

interface FileChangesListProps {
    title: string;
    changes: GitFileChange[];
    onAction: (filePath: string) => Promise<void>;
    onDiscard: (filePath: string) => Promise<void>;
    onViewDiff: (file: { path: string; staged: boolean }) => void;
    actionLabel: string;
    actionTitle: string;
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'added': return '+ ';
        case 'modified': case 'wd-modified': return 'M ';
        case 'deleted': case 'wd-deleted': return 'D ';
        case 'untracked': return 'U ';
        case 'renamed': return 'R ';
        case 'conflicted': return '! ';
        default: return '? ';
    }
};

export default function FileChangesList({
                                            title,
                                            changes,
                                            onAction,
                                            onDiscard,
                                            onViewDiff,
                                            actionLabel,
                                            actionTitle,
                                        }: FileChangesListProps) {
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, file: GitFileChange} | null>(null);

    return (
        <>
            <div className="git-section">
                <div className="git-section-header">{title}</div>
                {changes.map((change) => (
                    <div
                        key={change.path}
                        className="git-file-item"
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, file: change });
                        }}
                    >
                        <span
                            className="git-file-status"
                            onClick={() => onViewDiff({ path: change.path, staged: change.staged })}
                            style={{ cursor: 'pointer' }}
                            title="Click to view diff"
                        >
                            {getStatusIcon(change.status)}
                        </span>
                        <span
                            className="git-file-path"
                            onClick={() => onViewDiff({ path: change.path, staged: change.staged })}
                            style={{ cursor: 'pointer' }}
                            title="Click to view diff"
                        >
                            {change.path}
                        </span>
                        <div className="git-file-actions">
                            <button
                                className="git-action-btn"
                                onClick={() => onAction(change.path)}
                                title={actionTitle}
                            >
                                {actionLabel}
                            </button>
                            {change.status !== 'untracked' && (
                                <button
                                    className="git-action-btn danger"
                                    onClick={() => onDiscard(change.path)}
                                    title="Discard Changes"
                                >
                                    ↺
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={[
                        {
                            label: contextMenu.file.staged ? 'Unstage Changes' : 'Stage Changes',
                            onClick: () => onAction(contextMenu.file.path)
                        },
                        {
                            label: 'View Diff',
                            onClick: () => onViewDiff({
                                path: contextMenu.file.path,
                                staged: contextMenu.file.staged
                            })
                        },
                        {
                            label: 'Discard Changes',
                            onClick: () => onDiscard(contextMenu.file.path),
                            disabled: contextMenu.file.status === 'untracked',
                            danger: true
                        }
                    ]}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </>
    );
}