// src/renderer/components/GitPanel/GitPanel.tsx
import React, { useState } from 'react';
import './GitPanel.css';
import DiffViewer from './DiffViewer';
import ChangesTab from './tabs/ChangesTab';
import BranchesTab from './tabs/BranchesTab';
import HistoryTab from './tabs/HistoryTab';
import { useGitData } from './hooks/useGitData';
import { useGitOperations } from './hooks/useGitOperations';

const GIT_PANEL_TABS = {
    CHANGES: 'changes',
    BRANCHES: 'branches',
    HISTORY: 'history',
} as const;

type TabType = typeof GIT_PANEL_TABS[keyof typeof GIT_PANEL_TABS];

interface GitPanelProps {
    onClose: () => void;
}

export default function GitPanel({ onClose }: GitPanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>(GIT_PANEL_TABS.CHANGES);
    const [diffViewerFile, setDiffViewerFile] = useState<{path: string, staged: boolean} | null>(null);

    const { changes, branches, commits, currentBranch, loadChanges, loadBranches, loadCommits, loadAll } = useGitData();

    const operations = useGitOperations({
        loadChanges,
        loadBranches,
        loadCommits,
        loadAll,
    });

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
                {activeTab === GIT_PANEL_TABS.CHANGES && (
                    <ChangesTab
                        changes={changes}
                        onStage={operations.handleStage}
                        onUnstage={operations.handleUnstage}
                        onDiscard={operations.handleDiscard}
                        onCommit={operations.handleCommit}
                        onStash={operations.handleStash}
                        onStashPop={operations.handleStashPop}
                        onViewDiff={setDiffViewerFile}
                    />
                )}

                {activeTab === GIT_PANEL_TABS.BRANCHES && (
                    <BranchesTab
                        branches={branches}
                        currentBranch={currentBranch}
                        onCheckout={operations.handleCheckoutBranch}
                        onCreate={operations.handleCreateBranch}
                    />
                )}

                {activeTab === GIT_PANEL_TABS.HISTORY && (
                    <HistoryTab commits={commits} />
                )}

                {diffViewerFile && (
                    <DiffViewer
                        filePath={diffViewerFile.path}
                        staged={diffViewerFile.staged}
                        onClose={() => setDiffViewerFile(null)}
                    />
                )}
            </div>
        </div>
    );
}