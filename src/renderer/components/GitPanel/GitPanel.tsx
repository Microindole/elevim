// src/renderer/components/GitPanel/GitPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { GitFileChange, GitBranch, GitCommit } from '../../../main/lib/git-service';
import './GitPanel.css';
import DiffViewer from './DiffViewer';
import ContextMenu from "./ContextMenu";

const GIT_PANEL_TABS = {
    CHANGES: 'changes',
    BRANCHES: 'branches',
    HISTORY: 'history',
} as const;

const APP_EVENTS = {
    FOLDER_CHANGED: 'folder-changed',
    GIT_BRANCH_CHANGED: 'git-branch-changed',
} as const;

interface GitPanelProps {
    onClose: () => void;
}

type TabType = typeof GIT_PANEL_TABS[keyof typeof GIT_PANEL_TABS];

export default function GitPanel({ isVisible, onClose }: GitPanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>(GIT_PANEL_TABS.CHANGES);
    const [changes, setChanges] = useState<GitFileChange[]>([]);
    const [branches, setBranches] = useState<GitBranch[]>([]);
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [currentBranch, setCurrentBranch] = useState<string | null>(null);
    const [commitMessage, setCommitMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [diffViewerFile, setDiffViewerFile] = useState<{path: string, staged: boolean} | null>(null);
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, file: GitFileChange} | null>(null);

    const loadChanges = useCallback(async () => {
        const result = await window.electronAPI.gitGetChanges();
        setChanges(result);
    }, []);

    const loadBranches = useCallback(async () => {
        const result = await window.electronAPI.gitGetBranches();
        setBranches(result);
        const current = await window.electronAPI.gitGetCurrentBranch();
        setCurrentBranch(current);
    }, []);

    const loadCommits = useCallback(async () => {
        const result = await window.electronAPI.gitGetCommits(50);
        setCommits(result);
    }, []);

    useEffect(() => {
        if (isVisible) {
            loadChanges();
            loadBranches();
            loadCommits();
        }
    }, [isVisible, loadChanges, loadBranches, loadCommits]);

    useEffect(() => {
        const unsubscribe = window.electronAPI.onGitStatusChange(() => {
            if (isVisible) {
                loadChanges();
            }
        });
        return unsubscribe;
    }, [isVisible, loadChanges]);

    useEffect(() => {
        const handleFolderChange = () => {
            if (isVisible) {
                loadChanges();
                loadBranches();
                loadCommits();
            }
        };

        window.addEventListener(APP_EVENTS.FOLDER_CHANGED, handleFolderChange);
        return () => window.removeEventListener(APP_EVENTS.FOLDER_CHANGED, handleFolderChange);
    }, [isVisible, loadChanges, loadBranches, loadCommits]);

    const handleStage = async (filePath: string) => {
        const success = await window.electronAPI.gitStageFile(filePath);
        if (success) {
            await loadChanges();
        }
    };

    const handleUnstage = async (filePath: string) => {
        const success = await window.electronAPI.gitUnstageFile(filePath);
        if (success) {
            await loadChanges();
        }
    };

    const handleDiscard = async (filePath: string) => {
        if (!confirm(`Are you sure you want to discard changes to ${filePath}?`)) {
            return;
        }
        const success = await window.electronAPI.gitDiscardChanges(filePath);
        if (success) {
            await loadChanges();
        }
    };

    const handleCommit = async () => {
        const trimmedMessage = commitMessage.trim();

        if (!trimmedMessage) {
            alert('Please enter a commit message');
            return;
        }

        if (trimmedMessage.length < 3) {
            alert('Commit message must be at least 3 characters long');
            return;
        }

        if (stagedChanges.length === 0) {
            alert('No staged changes. Please stage files first.');
            return;
        }

        const success = await window.electronAPI.gitCommit(trimmedMessage);
        if (success) {
            setCommitMessage('');
            await loadChanges();
            await loadCommits();
            alert('Committed successfully!');
        } else {
            alert('Failed to commit. Check if Git user.name and user.email are configured.');
        }
    };

    const handleCheckoutBranch = async (branchName: string) => {
        const currentChanges = await window.electronAPI.gitGetChanges();
        const hasModifications = currentChanges.filter(c =>
            c.status !== 'untracked'
        ).length > 0;

        if (hasModifications) {
            const userChoice = window.confirm(
                `You have uncommitted changes that will prevent branch switching.\n\n` +
                `Please commit or discard your changes first.\n\n` +
                `Click OK to close this dialog.`
            );
            return;
        }

        const success = await window.electronAPI.gitCheckoutBranch(branchName);
        if (success) {
            await loadBranches();
            await loadChanges();
            await loadCommits();
            alert(`Switched to branch: ${branchName}`);
            window.dispatchEvent(new CustomEvent(APP_EVENTS.GIT_BRANCH_CHANGED));
        } else {
            alert(`Failed to switch to branch: ${branchName}`);
        }
    };

    const handleCreateBranch = async () => {
        const branchName = prompt('Enter new branch name:');
        if (!branchName) return;

        const success = await window.electronAPI.gitCreateBranch(branchName);
        if (success) {
            await loadBranches();
        } else {
            alert(`Failed to create branch ${branchName}`);
        }
    };

    const handleStash = async () => {
        const hasChangesToStash = changes.some(c => c.status !== 'untracked');
        if (!hasChangesToStash) {
            alert("No local modifications to stash.");
            return;
        }

        if (!confirm("Are you sure you want to stash your current changes?")) {
            return;
        }

        const success = await window.electronAPI.gitStash();
        if (success) {
            await loadChanges();
            alert("Changes stashed.");
        } else {
            alert("Failed to stash changes.");
        }
    };

    const handleStashPop = async () => {
        if (!confirm("Are you sure you want to apply the latest stash? This might cause conflicts.")) {
            return;
        }

        const success = await window.electronAPI.gitStashPop();
        if (success) {
            await loadChanges();
            alert("Stash applied.");
        } else {
            alert("Failed to apply stash. (Perhaps no stash exists, or there are conflicts).");
        }
    };

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

    const stagedChanges = changes.filter(c => c.staged);
    const unstagedChanges = changes.filter(c => !c.staged);
    const hasChangesToStash = changes.some(c => c.status !== 'untracked');

    return (
        <div className="git-panel">
            <div className="git-panel-header">
                <h3>Source Control</h3>
                <button className="git-close-btn" onClick={onClose}>×</button>
            </div>

            <div className="git-tabs">
                <button
                    className={`git-tab ${activeTab === GIT_PANEL_TABS.CHANGES ? 'active' : ''}`}
                    onClick={() => setActiveTab(GIT_PANEL_TABS.CHANGES)}
                >
                    Changes ({changes.length})
                </button>
                <button
                    className={`git-tab ${activeTab === GIT_PANEL_TABS.BRANCHES ? 'active' : ''}`}
                    onClick={() => setActiveTab(GIT_PANEL_TABS.BRANCHES)}
                >
                    Branches
                </button>
                <button
                    className={`git-tab ${activeTab === GIT_PANEL_TABS.HISTORY ? 'active' : ''}`}
                    onClick={() => setActiveTab(GIT_PANEL_TABS.HISTORY)}
                >
                    History
                </button>
            </div>

            <div className="git-content">
                {/* Changes Tab */}
                {activeTab === GIT_PANEL_TABS.CHANGES && (
                    <div className="git-changes">
                        <div className="git-actions-bar">
                            <button
                                className="git-action-btn secondary"
                                onClick={handleStash}
                                title="Stash current changes"
                                disabled={!hasChangesToStash}
                            >
                                Stash
                            </button>
                            <button
                                className="git-action-btn secondary"
                                onClick={handleStashPop}
                                title="Apply latest stash (Pop)"
                            >
                                Pop Stash
                            </button>
                        </div>

                        {/* Commit Input */}
                        {stagedChanges.length > 0 && (
                            <div className="git-commit-box">
                                <input
                                    type="text"
                                    className="git-commit-input"
                                    placeholder="Commit message..."
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) {
                                            handleCommit();
                                        }
                                    }}
                                />
                                <button
                                    className="git-commit-btn"
                                    onClick={handleCommit}
                                    disabled={!commitMessage.trim()}
                                >
                                    Commit
                                </button>
                            </div>
                        )}

                        {/* Staged Changes */}
                        {stagedChanges.length > 0 && (
                            <div className="git-section">
                                <div className="git-section-header">
                                    Staged Changes ({stagedChanges.length})
                                </div>
                                {stagedChanges.map((change) => (
                                    <div
                                        key={change.path}
                                        className="git-file-item"
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                file: change
                                            });
                                        }}
                                    >
                                        <span
                                            className="git-file-status"
                                            onClick={() => setDiffViewerFile({
                                                path: change.path,
                                                staged: true
                                            })}
                                            style={{cursor: 'pointer'}}
                                            title="Click to view diff"
                                        >
                                            {getStatusIcon(change.status)}
                                        </span>
                                        <span
                                            className="git-file-path"
                                            onClick={() => setDiffViewerFile({
                                                path: change.path,
                                                staged: change.staged
                                            })}
                                            style={{cursor: 'pointer'}}
                                            title="Click to view diff"
                                        >
                                            {change.path}
                                        </span>
                                        <div className="git-file-actions">
                                            <button
                                                className="git-action-btn"
                                                onClick={() => handleUnstage(change.path)}
                                                title="Unstage"
                                            >
                                                −
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Unstaged Changes */}
                        {unstagedChanges.length > 0 && (
                            <div className="git-section">
                                <div className="git-section-header">
                                    Changes ({unstagedChanges.length})
                                </div>
                                {unstagedChanges.map((change) => (
                                    <div
                                        key={change.path}
                                        className="git-file-item"
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                file: change
                                            });
                                        }}
                                    >
                                        <span
                                            className="git-file-status"
                                            onClick={() => setDiffViewerFile({
                                                path: change.path,
                                                staged: false
                                            })}
                                            style={{cursor: 'pointer'}}
                                            title="Click to view diff"
                                        >
                                            {getStatusIcon(change.status)}
                                        </span>
                                        <span
                                            className="git-file-path"
                                            onClick={() => setDiffViewerFile({
                                                path: change.path,
                                                staged: change.staged
                                            })}
                                            style={{cursor: 'pointer'}}
                                            title="Click to view diff"
                                        >
                                            {change.path}
                                        </span>
                                        <div className="git-file-actions">
                                            <button
                                                className="git-action-btn"
                                                onClick={() => handleStage(change.path)}
                                                title="Stage"
                                            >
                                                +
                                            </button>
                                            {change.status !== 'untracked' && (
                                                <button
                                                    className="git-action-btn danger"
                                                    onClick={() => handleDiscard(change.path)}
                                                    title="Discard Changes"
                                                >
                                                    ↺
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {changes.length === 0 && (
                            <div className="git-empty">
                                No changes to commit
                            </div>
                        )}
                    </div>
                )}

                {/* Branches Tab */}
                {activeTab === GIT_PANEL_TABS.BRANCHES && (
                    <div className="git-branches">
                        <div className="git-branch-header">
                            <span>Current: <strong>{currentBranch || 'Unknown'}</strong></span>
                            <button className="git-new-branch-btn" onClick={handleCreateBranch}>
                                + New Branch
                            </button>
                        </div>
                        <div className="git-branch-list">
                            {branches
                                .filter(b => !b.remote)
                                .map((branch) => (
                                    <div
                                        key={branch.name}
                                        className={`git-branch-item ${branch.current ? 'current' : ''}`}
                                        onClick={() => !branch.current && handleCheckoutBranch(branch.name)}
                                    >
                                        <span className="git-branch-icon">
                                            {branch.current ? '●' : '○'}
                                        </span>
                                        <span className="git-branch-name">{branch.name}</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === GIT_PANEL_TABS.HISTORY && (
                    <div className="git-history">
                        {commits.map((commit) => (
                            <div key={commit.hash} className="git-commit-item">
                                <div className="git-commit-message">{commit.message}</div>
                                <div className="git-commit-meta">
                                    <span className="git-commit-author">{commit.author}</span>
                                    <span className="git-commit-date">{commit.date}</span>
                                </div>
                                <div className="git-commit-hash">{commit.hash.substring(0, 7)}</div>
                            </div>
                        ))}
                        {commits.length === 0 && (
                            <div className="git-empty">No commit history</div>
                        )}
                    </div>
                )}

                {diffViewerFile && (
                    <DiffViewer
                        filePath={diffViewerFile.path}
                        staged={diffViewerFile.staged}
                        onClose={() => setDiffViewerFile(null)}
                    />
                )}

                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        items={[
                            {
                                label: contextMenu.file.staged ? 'Unstage Changes' : 'Stage Changes',
                                onClick: () => contextMenu.file.staged
                                    ? handleUnstage(contextMenu.file.path)
                                    : handleStage(contextMenu.file.path)
                            },
                            {
                                label: 'View Diff',
                                onClick: () => setDiffViewerFile({
                                    path: contextMenu.file.path,
                                    staged: contextMenu.file.staged
                                })
                            },
                            {
                                label: 'Discard Changes',
                                onClick: () => handleDiscard(contextMenu.file.path),
                                disabled: contextMenu.file.status === 'untracked',
                                danger: true
                            }
                        ]}
                        onClose={() => setContextMenu(null)}
                    />
                )}
            </div>
        </div>
    );
}