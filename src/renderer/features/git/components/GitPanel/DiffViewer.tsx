// src/renderer/features/git/components/GitPanel/DiffViewer.tsx
import React, { useEffect, useState } from 'react';
import { GitDiff } from '../../../../../main/lib/git/types';
import './DiffViewer.css';

interface DiffViewerProps {
    filePath: string;
    staged: boolean;
    onClose: () => void;
}

export default function DiffViewer({ filePath, staged, onClose }: DiffViewerProps) {
    const [diff, setDiff] = useState<GitDiff | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDiff = async () => {
            setLoading(true);
            setError(null);
            try {
                console.log(`[DiffViewer] Loading diff for: ${filePath}, staged: ${staged}`);
                const result = await window.electronAPI.git.gitGetDiff(filePath, staged); // MODIFIED
                console.log(`[DiffViewer] Got result:`, result);
                setDiff(result);
            } catch (err) {
                console.error('[DiffViewer] Error loading diff:', err);
                setError('Failed to load diff');
            } finally {
                setLoading(false);
            }
        };
        loadDiff();
    }, [filePath, staged]);

    const parseDiff = (diffText: string) => {
        const lines = diffText.split('\n');
        return lines.map((line, index) => {
            let className = 'diff-line';
            if (line.startsWith('+++') || line.startsWith('---')) {
                className += ' diff-file-header';
            } else if (line.startsWith('+')) {
                className += ' diff-addition';
            } else if (line.startsWith('-')) {
                className += ' diff-deletion';
            } else if (line.startsWith('@@')) {
                className += ' diff-hunk-header';
            }
            return { text: line, className, key: index };
        });
    };

    if (loading) {
        return (
            <div className="diff-viewer">
                <div className="diff-header">
                    <span>{filePath}</span>
                    <button onClick={onClose}>×</button>
                </div>
                <div className="diff-loading">Loading diff...</div>
            </div>
        );
    }

    if (!diff || !diff.changes) {
        return (
            <div className="diff-viewer">
                <div className="diff-header">
                    <span>{filePath}</span>
                    <button onClick={onClose}>×</button>
                </div>
                <div className="diff-empty">
                    {error || 'No changes or unable to generate diff'}
                </div>
            </div>
        );
    }

    const parsedLines = parseDiff(diff.changes);

    return (
        <div className="diff-viewer">
            <div className="diff-header">
                <span className="diff-file-name">{filePath}</span>
                <span className="diff-stats">
                    <span className="diff-additions">+{diff.additions}</span>
                    <span className="diff-deletions">-{diff.deletions}</span>
                </span>
                <button className="diff-close-btn" onClick={onClose}>×</button>
            </div>
            <div className="diff-content">
                <pre>
                    {parsedLines.map(line => (
                        <div key={line.key} className={line.className}>
                            {line.text || ' '}
                        </div>
                    ))}
                </pre>
            </div>
        </div>
    );
}