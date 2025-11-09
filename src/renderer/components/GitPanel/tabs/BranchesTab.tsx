// src/renderer/components/GitPanel/tabs/BranchesTab.tsx
import React from 'react';
import { GitBranch } from '../../../../main/lib/git/types';
import './BranchesTab.css';

interface BranchesTabProps {
    branches: GitBranch[];
    currentBranch: string | null;
    onCheckout: (branchName: string) => void;
    onCreate: () => void;
}

export default function BranchesTab({ branches, currentBranch, onCheckout, onCreate }: BranchesTabProps) {
    const localBranches = branches.filter(b => !b.remote);

    return (
        <div className="git-branches">
            <div className="git-branch-header">
                <span>Current: <strong>{currentBranch || 'Unknown'}</strong></span>
                <button className="git-new-branch-btn" onClick={onCreate}>
                    + New Branch
                </button>
            </div>
            <div className="git-branch-list">
                {localBranches.map((branch) => (
                    <div
                        key={branch.name}
                        className={`git-branch-item ${branch.current ? 'current' : ''}`}
                        onClick={() => !branch.current && onCheckout(branch.name)}
                    >
                        <span className="git-branch-icon">
                            {branch.current ? '●' : '○'}
                        </span>
                        <span className="git-branch-name">{branch.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}