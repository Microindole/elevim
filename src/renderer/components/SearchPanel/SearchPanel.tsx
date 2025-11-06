// src/renderer/components/SearchPanel/SearchPanel.tsx
import React, { useState } from 'react';
import './SearchPanel.css';
import { SearchResult } from '../../../shared/types';

// --- 新增 Props 接口 ---
interface SearchPanelProps {
    folderPath: string | null;
    onResultClick: (filePath: string, line: number) => void;
    onReplaceComplete: (modifiedFiles: string[]) => void;
}

export default function SearchPanel({ folderPath, onResultClick, onReplaceComplete }: SearchPanelProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isReplacing, setIsReplacing] = useState(false);

    const handleSearch = async () => {
        if (!folderPath || !searchTerm) return;

        setIsLoading(true);
        setResults([]); // 清空上次结果
        try {
            const searchResults = await window.electronAPI.globalSearch(searchTerm);
            setResults(searchResults);
        } catch (error) {
            console.error("Global search failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReplaceAll = async () => {
        if (!folderPath || !searchTerm) {
            alert("请输入搜索词。");
            return;
        }
        // 注意：replaceTerm 可以为空，表示删除

        // 渲染进程的最后确认
        if (!confirm(`您确定要在所有文件中将 "${searchTerm}" 替换为 "${replaceTerm}" 吗？\n\n此操作不可撤销！`)) {
            return;
        }

        setIsReplacing(true);
        try {
            const modifiedFiles = await window.electronAPI.globalReplace(searchTerm, replaceTerm);

            if (modifiedFiles.length > 0) {
                alert(`成功替换了 ${modifiedFiles.length} 个文件。`);
                // 通知 App.tsx 刷新已打开的编辑器
                onReplaceComplete(modifiedFiles);
                // 重新运行搜索以刷新结果列表
                await handleSearch();
            } else {
                alert("没有找到可替换的内容，或者您取消了操作。");
            }

        } catch (error) {
            console.error("Global replace failed:", error);
            alert("替换过程中发生错误。");
        } finally {
            setIsReplacing(false);
        }
    };

    const handleResultClick = (filePath: string, line: number) => {
        onResultClick(filePath, line);
    };

    // 如果没有打开文件夹，显示提示信息
    if (!folderPath) {
        return (
            <div className="search-panel">
                <div className="search-header">
                    <h3>Search</h3>
                </div>
                <div className="search-info">
                    (Open a folder to search across all files)
                </div>
            </div>
        );
    }

    // 如果打开了文件夹，显示搜索 UI
    return (
        <div className="search-panel">
            <div className="search-header">
                <h3>Search</h3>
            </div>
            <div className="search-content">
                <input
                    type="text"
                    placeholder="Search"
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <input
                    type="text"
                    placeholder="Replace"
                    className="search-input"
                    value={replaceTerm}
                    onChange={(e) => setReplaceTerm(e.target.value)}
                    disabled={isReplacing || isLoading}
                />
                <div className="search-button-group">
                    <button
                        className="search-btn"
                        onClick={handleSearch}
                        disabled={isLoading || isReplacing}
                    >
                        {isLoading ? 'Searching...' : 'Find All'}
                    </button>
                    <button
                        className="replace-btn"
                        onClick={handleReplaceAll}
                        disabled={isLoading || isReplacing}
                    >
                        {isReplacing ? 'Replacing...' : 'Replace All'}
                    </button>
                </div>
        </div>
    <div className="search-results-container">
        {results.length > 0 && (
            <div className="results-summary">
                Found {results.length} results in {new Set(results.map(r => r.filePath)).size} files
            </div>
        )}
        {results.map((result, index) => (
            <div
                key={index}
                className="search-result-item"
                onClick={() => handleResultClick(result.filePath, result.line)}
            >
                <div className="result-file-path">
                {/* 从 App.tsx 拿到 folderPath，用于显示相对路径 */}
                            {result.filePath.replace(folderPath, '').replace(/^[\\/]/, '')}
                        </div>
                        <div className="result-match-line">
                            <span className="result-line-number">{result.line}:</span>
                            <span className="result-match-text">{result.match}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}