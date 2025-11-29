// src/renderer/features/workbench/components/StatusBar/StatusBar.tsx
import React from 'react';
import './StatusBar.css';

// --- Git 分支 SVG 图标 ---
const GitBranchIcon = () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16" style={{ verticalAlign: 'text-bottom', marginRight: '4px' }}>
        <path d="M9.5 3.25a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-2.25 1a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"/>
        <path d="M11.75 8.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z m0-3a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z"/>
        <path d="M4.25 8.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z m0-3a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z"/>
        <path d="M 6.309,8.211 C 6.18,7.92 6,7.584 6,7.25 6,6.01 6.995,5 8.22,5 h 0.06 A 2.25,2.25 0 0 0 9.5,4.3 a 0.75,0.75 0 0 1 1.5,0 A 2.25,2.25 0 0 0 12.28,5 h 0.06 c 1.225,0 2.22,1.01 2.22,2.25 0,0.334 -0.18,0.67 -0.31,0.961 l -0.22,0.49 a 2.91,2.91 0 0 0 -2.31,1.33 L 11,11 H 5 L 4.27,11.041 A 2.91,2.91 0 0 0 1.96,9.711 l -0.22,-0.49 C 1.61,8.92 1.43,8.584 1.43,8.25 1.43,7.01 2.425,6 3.65,6 h 0.06 A 2.25,2.25 0 0 0 5,6.7 a 0.75,0.75 0 0 1 1.5,0 A 2.25,2.25 0 0 0 7.78,6 h 0.06 c 0.334,0 0.67,0.18 0.961,0.31 Z m -2,2.04 C 4.2,10.34 4.08,10.47 4.02,10.61 l -0.52,1.14 a 0.75,0.75 0 0 1 -1.35,-0.62 l 0.52,-1.14 C 2.76,9.78 2.98,9.56 3.25,9.41 c 0.26,-0.15 0.56,-0.24 0.88,-0.24 h 0.06 c 0.75,0 1.37,0.52 1.5,1.21 l 0.24,1.11 h 3.74 l 0.24,-1.11 c 0.13,-0.69 0.75,-1.21 1.5,-1.21 h 0.06 c 0.32,0 0.62,0.09 0.88,0.24 0.27,0.15 0.49,0.37 0.58,0.58 l 0.52,1.14 a 0.75,0.75 0 1 1 -1.35,0.62 l -0.52,-1.14 c -0.06,-0.14 -0.18,-0.27 -0.28,-0.37 z"/>
    </svg>
);

interface StatusBarProps {
    cursorLine: number;
    cursorCol: number;
    currentBranch: string | null;
    encoding: string | null;
}

export default function StatusBar({ cursorLine, cursorCol, currentBranch, encoding }: StatusBarProps) {
    return (
        <div className="status-bar-container">
            {/* 2. 左侧项目组 */}
            <div className="status-group status-group-left">
                {currentBranch && (
                    <div className="status-item hover-bright" title="Current Git Branch">
                        <GitBranchIcon />
                        {currentBranch}
                    </div>
                )}
                {/* (未来可以在这里添加 Git 同步状态图标) */}
            </div>

            {/* 3. 右侧项目组 */}
            <div className="status-group status-group-right">
                <div className="status-item hover-bright" title="Cursor Position">
                    {`Ln ${cursorLine}, Col ${cursorCol}`}
                </div>
                {encoding && (
                    <div className="status-item hover-bright" title="File Encoding">
                        {encoding}
                    </div>
                )}
                {/* (未来可以在这里添加语言模式, e.g., "TypeScript") */}
            </div>
        </div>
    );
}