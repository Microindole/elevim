// src/renderer/components/StatusBar/StatusBar.tsx
import React from 'react';
import './StatusBar.css';

interface StatusBarProps {
    cursorLine: number;
    cursorCol: number;
    // 未来可以扩展，比如文件编码、Git 分支等
}

export default function StatusBar({ cursorLine, cursorCol }: StatusBarProps) {
    return (
        <div className="status-bar-container">
            <div className="status-item">
                {`Ln ${cursorLine}, Col ${cursorCol}`}
            </div>
            {/* 这里是未来其他状态项的位置 */}
        </div>
    );
}