// src/renderer/components/GitPanel/tabs/HistoryTab.tsx
import React from 'react';
import { GitCommit } from '../../../../main/lib/git-service';
import './HistoryTab.css';

interface HistoryTabProps {
    commits: GitCommit[];
}

export default function HistoryTab({ commits }: HistoryTabProps) {
    return (
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
    );
}