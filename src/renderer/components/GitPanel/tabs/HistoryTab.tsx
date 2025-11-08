// src/renderer/components/GitPanel/tabs/HistoryTab.tsx
import React, { useState, useMemo } from 'react';
import { GitCommit } from '../../../../main/lib/git-service';
import './HistoryTab.css';

interface CommitNode extends GitCommit {
    column: number;     // 在图中的列位置
    connections: {     // 与其他提交的连接线
        from: number;  // 起始列
        to: number;    // 目标列
        color: string; // 线条颜色
    }[];
}

interface HistoryTabProps {
    commits: GitCommit[];
}

const CommitGraph: React.FC<{ graph: GitCommit['graph'], color?: string, maxColumns: number }> = ({ graph = [], color, maxColumns }) => {
    // 按照最大列数渲染，缺失位置填 empty，保证每一行列对齐
    const cols = Array.from({ length: Math.max(1, maxColumns) }, (_, i) => graph[i] ?? 'empty');

    return (
        <div className="commit-graph" role="img" aria-label="commit-graph" style={{ width: `${cols.length * 18}px` }}>
            {cols.map((type, index) => (
                <span key={index} className={`graph-element ${type}`}>
                    {type === 'commit' && <div className="commit-dot" style={{ backgroundColor: color }} />}
                    {type === 'line' && <div className="commit-line" style={{ backgroundColor: color }} />}
                    {type === 'merge-left' && <div className="merge-left" style={{ backgroundColor: color }} />}
                    {type === 'merge-right' && <div className="merge-right" style={{ backgroundColor: color }} />}
                    {type === 'line-across' && <div className="line-across" style={{ backgroundColor: color }} />}
                    {type === 'empty' && <div className="graph-empty" />}
                </span>
            ))}
        </div>
    );
};

export default function HistoryTab({ commits }: HistoryTabProps) {
    const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

    // 分配每个分支固定颜色
    const branchColors = useMemo(() => {
        const map = new Map<string, string>();
        commits.forEach(c => {
            const name = c.branch || 'HEAD';
            if (!map.has(name)) map.set(name, getRandomColor(name));
        });
        return map;
    }, [commits]);

    // 计算最大列数（确保每行 graph 列对齐）
    const maxColumns = useMemo(() => {
        return commits.reduce((m, c) => Math.max(m, (c.graph?.length ?? 0)), 0);
    }, [commits]);

    // 格式化日期显示
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleString();
    };

    return (
        <div className="git-history">
            {commits.map((commit) => {
                const graph = commit.graph ?? [];
                const color = branchColors.get(commit.branch || 'HEAD')!;
                const isMerge = (commit.parentHashes?.length || 0) > 1;

                return (
                    <div
                        key={commit.hash}
                        className={`git-commit-item ${selectedCommit === commit.hash ? 'selected' : ''}`}
                        onClick={() => setSelectedCommit(commit.hash === selectedCommit ? null : commit.hash)}
                        title={commit.message}
                    >
                        <CommitGraph graph={graph} color={color} maxColumns={maxColumns} />

                        <div className="git-commit-content">
                            <div className="git-commit-header">
                                <div className="git-commit-message">{commit.message}</div>

                                <div className="git-commit-meta">
                                    <span className="git-commit-branch" style={{ backgroundColor: alpha(color, 0.08), color }}>
                                        {commit.branch}
                                    </span>
                                    {isMerge && <span className="git-commit-merge">merge</span>}
                                    <span className="git-commit-hash">{commit.hash.substring(0, 7)}</span>
                                </div>
                            </div>

                            <div className="git-commit-sub">
                                <span className="git-commit-author">{commit.author}</span>
                                <span className="git-commit-date">{formatDate(commit.date)}</span>
                                {commit.fileChanges && (
                                    <span className="git-commit-stats">
                                        {commit.fileChanges.files.length} files • +{commit.fileChanges.additions} -{commit.fileChanges.deletions}
                                    </span>
                                )}
                            </div>

                            {selectedCommit === commit.hash && (
                                <div className="git-commit-expanded">
                                    <div className="git-commit-details">
                                        <div><strong>Author:</strong> {commit.author}</div>
                                        <div><strong>Date:</strong> {new Date(commit.date).toLocaleString()}</div>
                                        <div><strong>Hash:</strong> {commit.hash}</div>
                                        <div><strong>Parents:</strong> {(commit.parentHashes || []).map(p => p.substring(0,7)).join(', ') || '—'}</div>
                                    </div>

                                    {commit.fileChanges && (
                                        <div className="git-commit-files">
                                            <div className="git-commit-files-summary">
                                                <strong>Changes:</strong> {commit.fileChanges.additions} additions, {commit.fileChanges.deletions} deletions
                                            </div>
                                            <div className="git-commit-files-list">
                                                {commit.fileChanges.files.map(f => (
                                                    <div key={f} className="git-changed-file">{f}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="git-commit-actions">
                                        <button className="git-action-btn" onClick={(e) => { e.stopPropagation(); window.electronAPI.gitCheckoutCommit(commit.hash); }}>Checkout</button>
                                        <button className="git-action-btn" onClick={(e) => { e.stopPropagation(); window.electronAPI.gitCreateBranchFromCommit(commit.hash); }}>Create Branch</button>
                                        <button className="git-action-btn" onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(commit.hash); }}>Copy Hash</button>
                                        <button className="git-action-btn" onClick={(e) => { e.stopPropagation(); window.electronAPI.openCommitDiff(commit.hash); }}>Show Diff</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {commits.length === 0 && (
                <div className="git-empty">No commit history</div>
            )}
        </div>
    );
}

// 根据分支名生成固定的随机颜色
function getRandomColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
}

// 小工具：给颜色加透明
function alpha(hsl: string, a: number) {
    // hsl(...) -> hsla(...)
    if (hsl.startsWith('hsl(')) {
        return hsl.replace('hsl(', 'hsla(').replace(')', `, ${a})`);
    }
    return hsl;
}