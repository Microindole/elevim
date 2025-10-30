// src/renderer/components/GitPanel/GitPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { GitFileChange, GitBranch, GitCommit } from '../../../main/lib/git-service';
import './GitPanel.css';

interface GitPanelProps {
    isVisible: boolean;
    onClose: () => void;
}

type TabType = 'changes' | 'branches' | 'history';

export default function GitPanel({ isVisible, onClose }: GitPanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>('changes');
    const [changes, setChanges] = useState<GitFileChange[]>([]);
    const [branches, setBranches] = useState<GitBranch[]>([]);
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [currentBranch, setCurrentBranch] = useState<string | null>(null);
    const [commitMessage, setCommitMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    // 加载变更列表
    const loadChanges = useCallback(async () => {
        const result = await window.electronAPI.gitGetChanges();
        setChanges(result);
    }, []);

    // 加载分支列表
    const loadBranches = useCallback(async () => {
        const result = await window.electronAPI.gitGetBranches();
        setBranches(result);
        const current = await window.electronAPI.gitGetCurrentBranch();
        setCurrentBranch(current);
    }, []);

    // 加载提交历史
    const loadCommits = useCallback(async () => {
        const result = await window.electronAPI.gitGetCommits(50);
        setCommits(result);
    }, []);

    // 初始加载
    useEffect(() => {
        if (isVisible) {
            loadChanges();
            loadBranches();
            loadCommits();
        }
    }, [isVisible, loadChanges, loadBranches, loadCommits]);

    // 监听 Git 状态变化
    useEffect(() => {
        const unsubscribe = window.electronAPI.onGitStatusChange(() => {
            if (isVisible) {
                loadChanges();
            }
        });
        return unsubscribe;
    }, [isVisible, loadChanges]);

    // 暂存文件
    const handleStage = async (filePath: string) => {
        const success = await window.electronAPI.gitStageFile(filePath);
        if (success) {
            await loadChanges();
        }
    };

    // 取消暂存
    const handleUnstage = async (filePath: string) => {
        const success = await window.electronAPI.gitUnstageFile(filePath);
        if (success) {
            await loadChanges();
        }
    };

    // 丢弃修改
    const handleDiscard = async (filePath: string) => {
        if (!confirm(`Are you sure you want to discard changes to ${filePath}?`)) {
            return;
        }
        const success = await window.electronAPI.gitDiscardChanges(filePath);
        if (success) {
            await loadChanges();
        }
    };

    // 提交
    const handleCommit = async () => {
        if (!commitMessage.trim()) {
            alert('Please enter a commit message');
            return;
        }
        const success = await window.electronAPI.gitCommit(commitMessage);
        if (success) {
            setCommitMessage('');
            await loadChanges();
            await loadCommits();
        } else {
            alert('Failed to commit. Make sure you have staged changes.');
        }
    };

    // 切换分支
    const handleCheckoutBranch = async (branchName: string) => {
        const success = await window.electronAPI.gitCheckoutBranch(branchName);
        if (success) {
            await loadBranches();
            await loadChanges();
        } else {
            alert(`Failed to switch to branch ${branchName}`);
        }
    };

    // 创建分支
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

    // 获取状态图标
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

    if (!isVisible) return null;

    const stagedChanges = changes.filter(c => c.staged);
    const unstagedChanges = changes.filter(c => !c.staged);

    return (
        <div className="git-panel">
            <div className="git-panel-header">
                <h3>Source Control</h3>
                <button className="git-close-btn" onClick={onClose}>×</button>
            </div>

            <div className="git-tabs">
                <button 
                    className={`git-tab ${activeTab === 'changes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('changes')}
                >
                    Changes ({changes.length})
                </button>
                <button 
                    className={`git-tab ${activeTab === 'branches' ? 'active' : ''}`}
                    onClick={() => setActiveTab('branches')}
                >
                    Branches
                </button>
                <button 
                    className={`git-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </button>
            </div>

            <div className="git-content">
                {/* Changes Tab */}
                {activeTab === 'changes' && (
                    <div className="git-changes">
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
                                    <div key={change.path} className="git-file-item">
                                        <span className="git-file-status">
                                            {getStatusIcon(change.status)}
                                        </span>
                                        <span className="git-file-path">{change.path}</span>
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
                                    <div key={change.path} className="git-file-item">
                                        <span className="git-file-status">
                                            {getStatusIcon(change.status)}
                                        </span>
                                        <span className="git-file-path">{change.path}</span>
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
                {activeTab === 'branches' && (
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
                {activeTab === 'history' && (
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
            </div>
        </div>
    );
}