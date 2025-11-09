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

interface CommitPosition {
    hash: string;
    column: number;
    parents: string[];
    activeColumns: Set<number>; // 当前行活跃的列
}

// 计算每个提交的列位置和活跃列
function calculateCommitPositions(commits: GitCommit[]): Map<string, CommitPosition> {
    const positions = new Map<string, CommitPosition>();

    // 跟踪每列当前期待的提交hash
    const columnExpectedCommit: Map<number, string> = new Map();

    for (let i = 0; i < commits.length; i++) {
        const commit = commits[i];
        const parents = commit.parentHashes || [];

        // 找到当前提交应该在哪一列
        let commitColumn = -1;

        // 首先查找是否有列在等待这个提交
        for (const [col, expectedHash] of columnExpectedCommit.entries()) {
            if (expectedHash === commit.hash) {
                commitColumn = col;
                break;
            }
        }

        // 如果没找到，分配新列
        if (commitColumn === -1) {
            commitColumn = 0;
            while (columnExpectedCommit.has(commitColumn)) {
                commitColumn++;
            }
        }

        // 移除当前列的期待
        columnExpectedCommit.delete(commitColumn);

        // 为父提交分配列
        if (parents.length > 0) {
            // 第一个父提交继续在当前列
            columnExpectedCommit.set(commitColumn, parents[0]);

            // 其他父提交（合并来源）分配新列
            for (let j = 1; j < parents.length; j++) {
                let newCol = 0;
                while (columnExpectedCommit.has(newCol)) {
                    newCol++;
                }
                columnExpectedCommit.set(newCol, parents[j]);
            }
        }

        // 记录当前行所有活跃的列
        const activeColumns = new Set(columnExpectedCommit.keys());

        positions.set(commit.hash, {
            hash: commit.hash,
            column: commitColumn,
            parents: parents,
            activeColumns: activeColumns
        });
    }

    return positions;
}

const CommitGraph: React.FC<{
    commit: GitCommit;
    index: number;
    commits: GitCommit[];
    positions: Map<string, CommitPosition>;
    maxColumns: number;
}> = ({ commit, index, commits, positions, maxColumns }) => {
    const rowHeight = 32;
    const colWidth = 16;
    const svgWidth = Math.max(maxColumns * colWidth, 100);

    const currentPos = positions.get(commit.hash);
    if (!currentPos) return null;

    const currentColumn = currentPos.column;
    const parents = currentPos.parents;
    const activeColumns = currentPos.activeColumns;

    const midY = rowHeight / 2;

    // 获取上一行的活跃列（用于绘制进入当前行的线）
    const prevCommit = index > 0 ? commits[index - 1] : null;
    const prevPos = prevCommit ? positions.get(prevCommit.hash) : null;
    const prevActiveColumns = prevPos ? prevPos.activeColumns : new Set<number>();

    return (
        <svg
            className="commit-graph"
            width={svgWidth}
            height={rowHeight}
            viewBox={`0 0 ${svgWidth} ${rowHeight}`}
            preserveAspectRatio="xMinYMin meet"
        >
            {/* 绘制从上一行延续下来的所有活跃列的线 */}
            {Array.from(prevActiveColumns).map(col => {
                const colX = col * colWidth + colWidth / 2;
                const color = COLUMN_COLORS[col % COLUMN_COLORS.length];

                // 检查这条线是否连到当前提交
                const connectsToCommit = col === currentColumn;

                if (connectsToCommit) {
                    // 从上方连到提交点
                    return (
                        <line
                            key={`in-${col}`}
                            x1={colX}
                            y1={0}
                            x2={colX}
                            y2={midY}
                            stroke={color}
                            strokeWidth="2"
                            opacity="0.8"
                        />
                    );
                } else if (activeColumns.has(col)) {
                    // 穿过当前行（不在当前提交列）
                    return (
                        <line
                            key={`pass-${col}`}
                            x1={colX}
                            y1={0}
                            x2={colX}
                            y2={rowHeight}
                            stroke={color}
                            strokeWidth="2"
                            opacity="0.8"
                        />
                    );
                }
                return null;
            })}

            {/* 绘制从当前提交到父提交的线 */}
            {parents.map((parentHash, idx) => {
                // 找到父提交的位置
                let parentColumn = currentColumn; // 默认假设在同一列

                // 查找父提交实际在哪一列
                for (let j = index + 1; j < commits.length; j++) {
                    if (commits[j].hash === parentHash) {
                        const parentPos = positions.get(parentHash);
                        if (parentPos) {
                            parentColumn = parentPos.column;
                        }
                        break;
                    }
                }

                const x = currentColumn * colWidth + colWidth / 2;
                const parentX = parentColumn * colWidth + colWidth / 2;
                const color = COLUMN_COLORS[currentColumn % COLUMN_COLORS.length];
                const parentColor = COLUMN_COLORS[parentColumn % COLUMN_COLORS.length];

                if (parentColumn === currentColumn) {
                    // 直线向下
                    return (
                        <line
                            key={`out-${idx}-${parentHash.substring(0,7)}`}
                            x1={x}
                            y1={midY}
                            x2={x}
                            y2={rowHeight}
                            stroke={color}
                            strokeWidth="2"
                            opacity="0.8"
                        />
                    );
                } else {
                    // 曲线连接到其他列（合并或分支）
                    return (
                        <path
                            key={`out-${idx}-${parentHash.substring(0,7)}`}
                            d={`M ${x} ${midY} C ${x} ${midY + rowHeight / 2}, ${parentX} ${rowHeight / 2}, ${parentX} ${rowHeight}`}
                            stroke={idx === 0 ? color : parentColor}
                            strokeWidth="2"
                            fill="none"
                            opacity="0.7"
                        />
                    );
                }
            })}

            {/* 提交点 */}
            <circle
                cx={currentColumn * colWidth + colWidth / 2}
                cy={midY}
                r="4"
                fill={COLUMN_COLORS[currentColumn % COLUMN_COLORS.length]}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="1.5"
            />
            <circle
                cx={currentColumn * colWidth + colWidth / 2}
                cy={midY}
                r="4"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="0.5"
            />
        </svg>
    );
};

export default function HistoryTab({ commits }: HistoryTabProps) {
    const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

    // 计算提交位置
    const positions = useMemo(() => calculateCommitPositions(commits), [commits]);

    // 计算最大列数
    const maxColumns = useMemo(() => {
        let max = 0;
        positions.forEach(pos => {
            if (pos.column > max) max = pos.column;
            pos.activeColumns.forEach(col => {
                if (col > max) max = col;
            });
        });
        return max + 1;
    }, [positions]);

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
                                index={idx}
                                commits={commits}
                                positions={positions}
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