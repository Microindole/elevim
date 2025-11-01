// src/renderer/components/ActivityBar/ActivityBar.tsx
import React from 'react';
import './ActivityBar.css';

// 我们可以先用 Emoji 或字符代替图标
const ICONS = {
    explorer: '📄', // 文件
    search: '🔍',   // 搜索
    git: 'Git',      // Git (使用字符)
    settings: '⚙️', // 设置
};

export type SidebarView = 'explorer' | 'search' | 'git' | 'settings' | null;

interface ActivityBarProps {
    activeView: SidebarView;
    onViewChange: (view: SidebarView) => void;
}

export default function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {

    // 封装点击逻辑：如果点击的已经是激活的，则关闭侧边栏 (null)
    const handleClick = (view: SidebarView) => {
        if (view) { // 确保 view 不是 null
            onViewChange(activeView === view ? null : view);
        }
    };

    return (
        <div className="activity-bar">
            <div className="top-icons">
                <button
                    className={`activity-btn ${activeView === 'explorer' ? 'active' : ''}`}
                    title="Explorer"
                    onClick={() => handleClick('explorer')}
                >
                    {ICONS.explorer}
                </button>
                <button
                    className={`activity-btn ${activeView === 'search' ? 'active' : ''}`}
                    title="Search"
                    onClick={() => handleClick('search')}
                >
                    {ICONS.search}
                </button>
                <button
                    className={`activity-btn ${activeView === 'git' ? 'active' : ''}`}
                    title="Source Control"
                    onClick={() => handleClick('git')}
                >
                    {ICONS.git}
                </button>
            </div>
            <div className="bottom-icons">
                <button
                    className={`activity-btn ${activeView === 'settings' ? 'active' : ''}`}
                    title="Settings"
                    onClick={() => handleClick('settings')}
                >
                    {ICONS.settings}
                </button>
            </div>
        </div>
    );
}