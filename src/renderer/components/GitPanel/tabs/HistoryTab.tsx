// src/renderer/components/GitPanel/tabs/HistoryTab.tsx
import React, { useState, useMemo } from 'react';
import { GitCommit } from '../../../../main/lib/git/types';
import './HistoryTab.css';

interface HistoryTabProps {
    commits: GitCommit[];
}

// 为每一列分配固定颜色
const COLUMN_COLORS = [
    'hsl(210, 75%, 60%)',  // 蓝色
    'hsl(140, 75%, 55%)',  // 绿色
    'hsl(30, 85%, 60%)',   // 橙色
    'hsl(280, 70%, 65%)',  // 紫色
    'hsl(350, 75%, 60%)',  // 红色
    'hsl(180, 70%, 55%)',  // 青色
    'hsl(50, 85%, 60%)',   // 黄色
    'hsl(310, 70%, 65%)',  // 粉色
];

const CommitGraph: React.FC<{
    commit: GitCommit;
    nextCommit?: GitCommit;
    maxColumns: number;
}> = ({ commit, nextCommit, maxColumns }) => {
    const graph = commit.graph ?? [];
    const nextGraph = nextCommit?.graph ?? [];

    // 找到当前提交点的列索引
    const commitColumnIndex = graph.findIndex(g => g === 'commit');

    // 确保长度一致
    const cols = Array.from({ length: maxColumns }, (_, i) => ({
        current: graph[i] ?? 'empty',
        next: nextGraph[i] ?? 'empty',
        color: COLUMN_COLORS[i % COLUMN_COLORS.length]
    }));

    return (
        <svg className="commit-graph" width={maxColumns * 24} height="100%" preserveAspectRatio="none">
            <defs>
                {COLUMN_COLORS.map((color, i) => (
                    <React.Fragment key={i}>
                        <linearGradient id={`line-gradient-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.85" />
                        </linearGradient>
                    </React.Fragment>
                ))}
            </defs>

            {cols.map((col, index) => {
                const x = index * 24 + 12; // 中心点
                const type = col.current;
                const nextType = col.next;

                // 判断是否需要绘制连接到下一行的线
                const needsLineToNext = (
                    type === 'line' ||
                    type === 'commit' ||
                    type === 'merge-left' ||
                    type === 'merge-right'
                ) && (
                    nextType === 'line' ||
                    nextType === 'commit' ||
                    nextType === 'merge-left' ||
                    nextType === 'merge-right'
                );

                return (
                    <g key={index}>
                        {/* 上半部分：连接到上一行 */}
                        {(type === 'line' || type === 'merge-left' || type === 'merge-right' || type === 'commit') && (
                            <line
                                x1={x}
                                y1="0"
                                x2={x}
                                y2="50%"
                                stroke={col.color}
                                strokeWidth="3"
                                opacity="0.85"
                                strokeLinecap="round"
                            />
                        )}

                        {/* 合并线 - 斜线 */}
                        {type === 'merge-left' && index > 0 && (
                            <line
                                x1={(index - 1) * 24 + 12}
                                y1="0"
                                x2={x}
                                y2="50%"
                                stroke={col.color}
                                strokeWidth="3"
                                opacity="0.75"
                                strokeLinecap="round"
                            />
                        )}
                        {type === 'merge-right' && index < maxColumns - 1 && (
                            <line
                                x1={(index + 1) * 24 + 12}
                                y1="0"
                                x2={x}
                                y2="50%"
                                stroke={col.color}
                                strokeWidth="3"
                                opacity="0.75"
                                strokeLinecap="round"
                            />
                        )}

                        {/* 横线 */}
                        {type === 'line-across' && (
                            <line
                                x1={0}
                                y1="50%"
                                x2={maxColumns * 24}
                                y2="50%"
                                stroke={col.color}
                                strokeWidth="3"
                                opacity="0.85"
                                strokeLinecap="round"
                            />
                        )}

                        {/* 提交点 */}
                        {type === 'commit' && (
                            <>
                                <circle
                                    cx={x}
                                    cy="50%"
                                    r="7"
                                    fill={col.color}
                                    stroke="rgba(0,0,0,0.4)"
                                    strokeWidth="3"
                                />
                                <circle
                                    cx={x}
                                    cy="50%"
                                    r="7"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.15)"
                                    strokeWidth="1"
                                />
                            </>
                        )}

                        {/* 下半部分：连接到下一行 */}
                        {needsLineToNext && (
                            <line
                                x1={x}
                                y1="50%"
                                x2={x}
                                y2="100%"
                                stroke={col.color}
                                strokeWidth="3"
                                opacity="0.85"
                                strokeLinecap="round"
                            />
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default function HistoryTab({ commits }: HistoryTabProps) {
    const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

    // 分配每个分支固定颜色
    const branchColors = useMemo(() => {
        const map = new Map<string, string>();
        commits.forEach(c => {
            const name = c.branch || 'HEAD';
            if (!map.has(name)) {
                const index = map.size;
                map.set(name, COLUMN_COLORS[index % COLUMN_COLORS.length]);
            }
        });
        return map;
    }, [commits]);

    // 计算最大列数
    const maxColumns = useMemo(() => {
        return Math.max(1, ...commits.map(c => c.graph?.length ?? 0));
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
            {commits.map((commit, idx) => {
                const color = branchColors.get(commit.branch || 'HEAD')!;
                const isMerge = (commit.parentHashes?.length || 0) > 1;
                const nextCommit = commits[idx + 1];

                return (
                    <div
                        key={commit.hash}
                        className={`git-commit-item ${selectedCommit === commit.hash ? 'selected' : ''}`}
                        onClick={() => setSelectedCommit(commit.hash === selectedCommit ? null : commit.hash)}
                        title={commit.message}
                    >
                        <div className="git-commit-graph-container">
                            <CommitGraph
                                commit={commit}
                                nextCommit={nextCommit}
                                maxColumns={maxColumns}
                            />
                        </div>

                        <div className="git-commit-content">
                            <div className="git-commit-header">
                                <div className="git-commit-message">{commit.message}</div>

                                <div className="git-commit-meta">
                                    <span className="git-commit-branch" style={{ backgroundColor: alpha(color, 0.15), color, borderColor: color }}>
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

// 小工具：给颜色加透明
function alpha(hsl: string, a: number) {
    if (hsl.startsWith('hsl(')) {
        return hsl.replace('hsl(', 'hsla(').replace(')', `, ${a})`);
    }
    return hsl;
}