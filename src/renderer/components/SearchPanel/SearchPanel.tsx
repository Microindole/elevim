// src/renderer/components/SearchPanel/SearchPanel.tsx
import React, { useState } from 'react';
import './SearchPanel.css';
import { SearchResult } from '../../../shared/types'; // 导入我们定义的类型

// --- 新增 Props 接口 ---
interface SearchPanelProps {
    folderPath: string | null;
    onResultClick: (filePath: string, line: number) => void;
}

export default function SearchPanel({ folderPath, onResultClick }: SearchPanelProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
                    placeholder="Replace (Not Implemented)"
                    className="search-input"
                    value={replaceTerm}
                    onChange={(e) => setReplaceTerm(e.target.value)}
                    disabled // 替换功能先禁用
                />
                <button
                    className="search-btn"
                    onClick={handleSearch}
                    disabled={isLoading}
                >
                    {isLoading ? 'Searching...' : 'Find All'}
                </button>
            </div>

            {/* --- 新增：搜索结果区域 --- */}
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