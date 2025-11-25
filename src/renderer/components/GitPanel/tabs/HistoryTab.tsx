// src/renderer/components/GitPanel/tabs/HistoryTab.tsx
import React, { useState, useMemo } from 'react';
import { GitCommit } from '../../../../main/lib/git/types';
import './HistoryTab.css';

interface HistoryTabProps {
    commits: GitCommit[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;
}

// --- 定义会话级随机基础色相 ---
// Math.random() 只会在应用加载这个 JS 文件时执行一次。
// 只要你不刷新页面 (F5/重启应用)，这个值就会一直保持不变。
// 切换 Tab 不会重新加载文件，所以颜色会保持稳定。
const SESSION_BASE_HUE = Math.floor(Math.random() * 360);
const SESSION_SATURATION = 40 + Math.floor(Math.random() * 15); // 40% ~ 55% 之间浮动

// 动态颜色生成器 (基于黄金角，支持无限分支颜色不重复)
const getColorByIndex = (index: number): string => {
    // 黄金角约等于 137.508 度，能让颜色在色环上分布最均匀，互不冲突
    const goldenAngle = 137.508;

    // 计算色相 (0-360)
    // 加上随机基准色
    // 这样 index=0 的分支可能是红色，下次启动可能是蓝色，但相对关系不变
    const hue = (SESSION_BASE_HUE + index * goldenAngle) % 360;

    // 饱和度随机, 亮度 60% (保证在深色模式下清晰且不刺眼)
    return `hsl(${hue}, ${SESSION_SATURATION}%, 60%)`;
};

const ROW_HEIGHT = 32;
const COL_WIDTH = 16;
const MID_Y = ROW_HEIGHT / 2;

// 绘图指令
interface DrawCommand {
    key: string;
    d: string;
    color: string;
    width: number;
}

interface GraphRow {
    hash: string;
    nodeX: number;      // 当前提交点的 X 坐标
    nodeColor: string;  // 当前提交点的颜色
    commands: DrawCommand[]; // 连线指令
}

// --- 核心算法：基于列保留的流式布局 ---
// --- 核心算法：基于列保留的流式布局 ---
function calculateGraph(commits: GitCommit[]): { rows: Map<string, GraphRow>, maxCol: number } {
    const rows = new Map<string, GraphRow>();

    // currentColumns 记录当前行上方“流”下来的线
    let currentColumns: { hash: string; colorIndex: number }[] = [];

    // 全局颜色计数器
    let nextColorIndex = 0;
    const branchColorMap = new Map<string, number>();

    // 获取分支颜色索引 (保持同名分支颜色一致)
    const getBranchColorIndex = (branchName: string) => {
        if (branchName && branchName !== 'HEAD') {
            if (!branchColorMap.has(branchName)) {
                // 存入单纯的数字索引，不再取模
                branchColorMap.set(branchName, nextColorIndex++);
            }
            return branchColorMap.get(branchName)!;
        }
        return nextColorIndex++;
    };

    commits.forEach((commit) => {
        const commands: DrawCommand[] = [];

        // --- 第一步：处理“入线” (Top -> Center) ---

        const indicesOfMe: number[] = [];
        currentColumns.forEach((col, idx) => {
            if (col && col.hash === commit.hash) {
                indicesOfMe.push(idx);
            }
        });

        let myCol = -1;
        let myColorIndex = 0;

        if (indicesOfMe.length > 0) {
            myCol = indicesOfMe[0];
            myColorIndex = currentColumns[myCol].colorIndex;
        } else {
            myCol = currentColumns.findIndex(c => c === null);
            if (myCol === -1) myCol = currentColumns.length;
            myColorIndex = getBranchColorIndex(commit.branch);
        }

        // 【修改点1】直接生成颜色，不再查数组
        const myColor = getColorByIndex(myColorIndex);
        const nodeX = myCol * COL_WIDTH + COL_WIDTH / 2;

        // 1. Pass-through (别人的线)
        currentColumns.forEach((col, idx) => {
            if (col && col.hash !== commit.hash) {
                const x = idx * COL_WIDTH + COL_WIDTH / 2;
                // 【修改点2】动态颜色
                const color = getColorByIndex(col.colorIndex);
                commands.push({
                    key: `pass-${idx}`,
                    d: `M ${x} 0 L ${x} 100%`,
                    color: color,
                    width: 2
                });
            }
        });

        // 2. Join (汇入我的线)
        indicesOfMe.forEach((fromCol) => {
            const startX = fromCol * COL_WIDTH + COL_WIDTH / 2;
            // 【修改点3】动态颜色
            const color = getColorByIndex(currentColumns[fromCol].colorIndex);

            if (fromCol === myCol) {
                commands.push({
                    key: `in-straight-${fromCol}`,
                    d: `M ${startX} 0 L ${startX} ${MID_Y}`,
                    color: color,
                    width: 2
                });
            } else {
                const cpY = MID_Y / 2;
                commands.push({
                    key: `in-merge-${fromCol}`,
                    d: `M ${startX} 0 C ${startX} ${cpY}, ${nodeX} ${cpY}, ${nodeX} ${MID_Y}`,
                    color: color,
                    width: 2
                });
            }
        });

        // --- 第二步：准备下一行的状态 (Out Lines) ---

        const nextColumns = [...currentColumns];
        indicesOfMe.forEach(idx => {
            // @ts-ignore
            nextColumns[idx] = null;
        });

        const parents = commit.parentHashes || [];

        parents.forEach((parentHash, i) => {
            let targetCol = -1;
            let lineColorIndex = myColorIndex;

            if (i === 0) {
                targetCol = myCol;
            } else {
                // 【修改点4】副父节点使用新颜色，直接++，不取模
                lineColorIndex = nextColorIndex++;
                targetCol = nextColumns.findIndex(c => c === null);
                if (targetCol === -1) targetCol = nextColumns.length;
            }

            // 冲突检测
            if (nextColumns[targetCol] && nextColumns[targetCol].hash === parentHash) {
                // 复用
            } else if (nextColumns[targetCol] !== null) {
                let newCol = nextColumns.findIndex(c => c === null);
                if (newCol === -1) newCol = nextColumns.length;
                targetCol = newCol;
                nextColumns[targetCol] = { hash: parentHash, colorIndex: lineColorIndex };
            } else {
                nextColumns[targetCol] = { hash: parentHash, colorIndex: lineColorIndex };
            }

            const targetX = targetCol * COL_WIDTH + COL_WIDTH / 2;
            // 【修改点5】动态颜色
            const lineColor = getColorByIndex(lineColorIndex);

            if (targetCol === myCol) {
                commands.push({
                    key: `out-straight-${i}`,
                    d: `M ${nodeX} ${MID_Y} L ${nodeX} 100%`,
                    color: lineColor,
                    width: 2
                });
            } else {
                const cpY = MID_Y + (ROW_HEIGHT - MID_Y) / 2;
                commands.push({
                    key: `out-branch-${i}`,
                    d: `M ${nodeX} ${MID_Y} C ${nodeX} ${cpY}, ${targetX} ${cpY}, ${targetX} ${ROW_HEIGHT}`,
                    color: lineColor,
                    width: 2
                });

                // 垂直尾巴 (自适应高度)
                commands.push({
                    key: `out-branch-tail-${i}`,
                    d: `M ${targetX} ${ROW_HEIGHT} L ${targetX} 100%`,
                    color: lineColor,
                    width: 2
                });
            }
        });

        currentColumns = nextColumns;

        rows.set(commit.hash, {
            hash: commit.hash,
            nodeX,
            nodeColor: myColor,
            commands
        });
    });

    return { rows, maxCol: currentColumns.length };
}
// --- Graph 组件 ---
const GraphCell: React.FC<{
    row: GraphRow | undefined;
    width: number;
}> = ({ row, width }) => {
    if (!row) return null;

    return (
        <svg
            className="graph-svg"
            style={{ width: width, height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
        >
            {/* 1. 绘制所有线条 */}
            {row.commands.map((cmd) => {
                // 特殊处理：如果是直线 (Vertical)，使用 <line> 以支持 height: 100%
                // 正则检测 d 属性是否是纯直线 M x 0 L x 100% 或者 M x 16 L x 100%
                const isVertical = cmd.d.includes('L') && cmd.d.includes('100%') && !cmd.d.includes('C');

                if (isVertical) {
                    // 解析坐标
                    const parts = cmd.d.split(' ');
                    const x1 = parseFloat(parts[1]);
                    const y1 = parseFloat(parts[2]);
                    const x2 = parseFloat(parts[4]);
                    // y2 是 '100%'

                    return (
                        <line
                            key={cmd.key}
                            x1={x1} y1={y1}
                            x2={x2} y2="100%"
                            stroke={cmd.color}
                            strokeWidth={cmd.width}
                            strokeLinecap="round"
                        />
                    );
                } else {
                    // 曲线
                    return (
                        <path
                            key={cmd.key}
                            d={cmd.d}
                            stroke={cmd.color}
                            strokeWidth={cmd.width}
                            fill="none"
                            strokeLinecap="round"
                        />
                    );
                }
            })}

            {/* 2. 绘制节点圆点 */}
            <circle
                cx={row.nodeX}
                cy={MID_Y}
                r="3.5"
                fill={row.nodeColor}
                stroke="var(--bg-sidebar)" // 镂空效果
                strokeWidth="2"
            />
        </svg>
    );
};

export default function HistoryTab({ commits, onLoadMore, hasMore, isLoading }: HistoryTabProps) {
    const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
    const [detailsCache, setDetailsCache] = useState<Record<string, any>>({});
    const [loadingDetails, setLoadingDetails] = useState(false);

    // 重新计算
    const { rows, maxCol } = useMemo(() => calculateGraph(commits), [commits]);

    const handleCommitClick = async (hash: string) => {
        if (selectedCommit === hash) {
            setSelectedCommit(null);
            return;
        }
        setSelectedCommit(hash);

        if (!detailsCache[hash]) {
            setLoadingDetails(true);
            try {
                const details = await window.electronAPI.git.gitGetCommitDetails(hash);
                if (details) {
                    setDetailsCache(prev => ({ ...prev, [hash]: details }));
                }
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const graphWidth = Math.max((maxCol + 2) * COL_WIDTH, 40);

    return (
        <div className="git-history">
            {commits.map((commit) => {
                const row = rows.get(commit.hash);
                const isSelected = selectedCommit === commit.hash;
                const details = detailsCache[commit.hash];

                return (
                    <div
                        key={commit.hash}
                        className={`git-commit-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleCommitClick(commit.hash)}
                    >
                        {/* Graph Column */}
                        <div className="git-graph-col" style={{ width: graphWidth, minWidth: graphWidth }}>
                            <GraphCell row={row} width={graphWidth} />
                        </div>

                        {/* Content Column */}
                        <div className="git-commit-content">
                            <div className="git-commit-row-main">
                                <div className="git-commit-message" title={commit.message}>
                                    {commit.message}
                                </div>
                                <div className="git-commit-meta">
                                    <span className="git-commit-hash">{commit.hash.substring(0, 7)}</span>
                                    <span className="git-commit-date">{formatDate(commit.date)}</span>
                                </div>
                            </div>
                            <div className="git-commit-author-row">
                                <span className="git-commit-author">{commit.author}</span>
                                {commit.branch && (
                                    <span className="git-commit-branch-label"
                                          style={{
                                              color: row?.nodeColor,
                                              borderColor: row?.nodeColor,
                                              backgroundColor: `${row?.nodeColor}15`
                                          }}>
                                        {commit.branch}
                                    </span>
                                )}
                            </div>

                            {/* Expanded Details */}
                            {isSelected && (
                                <div className="git-commit-details-panel" onClick={e => e.stopPropagation()}>
                                    {loadingDetails && !details && <div className="loading-text">Loading...</div>}
                                    {details && (
                                        <>
                                            <div className="stats-bar">
                                                <span className="stat-add">+{details.additions}</span>
                                                <span className="stat-del">-{details.deletions}</span>
                                                <span className="stat-files">{details.files.length} files</span>
                                            </div>
                                            <div className="file-list">
                                                {details.files.map((f: string) => (
                                                    <div key={f} className="file-row" title={f}>{f}</div>
                                                ))}
                                            </div>
                                            <div className="action-bar">
                                                <button onClick={() => window.electronAPI.git.gitCheckoutCommit(commit.hash)}>Checkout</button>
                                                <button onClick={() => window.electronAPI.git.gitCreateBranchFromCommit(commit.hash)}>Branch</button>
                                                <button onClick={() => navigator.clipboard.writeText(commit.hash)}>Copy Hash</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {hasMore && (
                <div className="load-more-container">
                    <button className="load-more-btn" onClick={onLoadMore} disabled={isLoading}>
                        {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
}