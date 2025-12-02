// src/renderer/features/workbench/components/ActivityBar/ActivityBar.tsx
import React from 'react';
import './ActivityBar.css';
import { VSCodeIcons } from './icons';

export type SidebarView = 'explorer' | 'search' | 'git' | 'references' | 'settings' | null;

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
                    {VSCodeIcons.explorer}
                </button>
                <button
                    className={`activity-btn ${activeView === 'search' ? 'active' : ''}`}
                    title="Search"
                    onClick={() => handleClick('search')}
                >
                    {VSCodeIcons.search}
                </button>
                <button
                    className={`activity-btn ${activeView === 'git' ? 'active' : ''}`}
                    title="Source Control"
                    onClick={() => handleClick('git')}
                >
                    {VSCodeIcons.git}
                </button>
                <button
                    className={`activity-btn ${activeView === 'references' ? 'active' : ''}`}
                    title="Backlinks / References"
                    onClick={() => handleClick('references')}
                >
                    {VSCodeIcons.references}
                </button>
            </div>
            <div className="bottom-icons">
                <button
                    className={`activity-btn ${activeView === 'settings' ? 'active' : ''}`}
                    title="Settings"
                    onClick={() => handleClick('settings')}
                >
                    {VSCodeIcons.settings}
                </button>
            </div>
        </div>
    );
}