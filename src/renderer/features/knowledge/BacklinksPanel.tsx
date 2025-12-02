// src/renderer/features/knowledge/BacklinksPanel.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { SearchResult } from '../../../shared/types';

interface BacklinksPanelProps {
    currentFilePath: string | null;
    projectPath: string | null;
    onOpenFile: (path: string, line: number) => void;
}

// 辅助函数：转义正则特殊字符 (防止文件名中有 +, (, ) 等导致正则报错)
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function BacklinksPanel({ currentFilePath, projectPath, onOpenFile }: BacklinksPanelProps) {
    const [backlinks, setBacklinks] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 核心搜索逻辑
    const fetchBacklinks = useCallback(async () => {
        if (!currentFilePath || !projectPath) {
            setBacklinks([]);
            return;
        }

        setIsLoading(true);
        try {
            // 1. 获取当前文件名 (不含后缀)
            // 例如: "C:/Users/Code/Note.md" -> "Note"
            const parts = currentFilePath.split(/[\\/]/);
            const rawName = parts.pop();
            if (!rawName) return;
            const filename = rawName.replace(/\.[^/.]+$/, "");

            console.log(`[Backlinks] Searching for references to: [[${filename}]]`);

            // 2. 构建增强版正则表达式 (关键修复)
            // 目标: 兼容 [[Note]], [[Note.md]], [[Note|别名]], [[Note.md|别名]]
            const escapedFilename = escapeRegExp(filename);

            // 正则解释：
            // \\[              -> 匹配 [[
            // ${escapedFilename} -> 文件名 (如 "a")
            // (?:\\.[a-zA-Z0-9]+)? -> 非捕获组，匹配可选的后缀 (如 ".md", ".txt")
            // (\\|.*?)?        -> 可选的别名部分 (如 "|别名")
            // \\]              -> 匹配 ]]
            const regexPattern = `\\[\\[${escapedFilename}(?:\\.[a-zA-Z0-9]+)?(\\|.*?)?\\]\\]`;

            const options = {
                searchTerm: regexPattern,
                isRegex: true,
                isCaseSensitive: false,
                isWholeWord: false
            };

            // 3. 执行全局搜索
            // @ts-ignore
            const results = await window.electronAPI.file.globalSearch(options);

            // 4. 过滤掉自己引用自己的情况
            const filtered = results.filter((r: SearchResult) => r.filePath !== currentFilePath);

            console.log(`[Backlinks] Found ${filtered.length} results`);
            setBacklinks(filtered);
        } catch (e) {
            console.error("[Backlinks] Failed to fetch:", e);
        } finally {
            setIsLoading(false);
        }
    }, [currentFilePath, projectPath]);

    // 初始加载
    useEffect(() => {
        fetchBacklinks();
    }, [fetchBacklinks]);

    // 监听全局 'folder-changed' 事件 (保存文件时自动刷新)
    useEffect(() => {
        const handleRefresh = () => {
            // console.log("[Backlinks] Received folder-changed event, refreshing...");
            fetchBacklinks();
        };
        window.addEventListener('folder-changed', handleRefresh);
        return () => window.removeEventListener('folder-changed', handleRefresh);
    }, [fetchBacklinks]);

    if (!currentFilePath) return <div style={{padding: 20, color: '#888'}}>No file open</div>;

    return (
        <div className="backlinks-panel" style={{height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-color)'}}>
            <div className="panel-header" style={{
                padding: '10px',
                borderBottom: '1px solid var(--border-color-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{
                    fontWeight: 'bold',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    color: 'var(--text-color-subtle)'
                }}>
                    Backlinks
                </span>
                <button
                    onClick={fetchBacklinks}
                    title="Refresh"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-color-subtle)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '0 4px'
                    }}
                >
                    ↻
                </button>
            </div>

            <div className="panel-content" style={{flex: 1, overflowY: 'auto'}}>
                {isLoading && <div style={{padding: 10, fontSize: '12px', color: '#888'}}>Scanning...</div>}

                {!isLoading && backlinks.length === 0 && (
                    <div style={{padding: 10, color: '#666', fontStyle: 'italic', fontSize: '13px'}}>
                        No linked mentions found.
                    </div>
                )}

                {backlinks.map((link, i) => (
                    <div
                        key={i}
                        className="backlink-item"
                        style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            transition: 'background-color 0.2s'
                        }}
                        onClick={() => onOpenFile(link.filePath, link.line)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <div style={{fontSize: '13px', color: 'var(--accent-color)', marginBottom: '4px', fontWeight: 500}}>
                            {link.filePath.split(/[\\/]/).pop()}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: 'var(--text-color-subtle)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontFamily: "'Consolas', monospace",
                            opacity: 0.8
                        }} title={link.match}>
                            {link.line}: {link.match.trim()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}