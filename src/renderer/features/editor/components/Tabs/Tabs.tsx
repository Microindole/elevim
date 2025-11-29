// src/renderer/features/editor/components/Tabs/Tabs.tsx
import React from 'react';
import './Tabs.css';
import { getIcon } from '../../../explorer/components/FileTree/icon-map'; // 导入图标工具

export interface OpenFile {
    id: string;
    path: string | null;
    name: string;
    content: string;
    isDirty: boolean;
    encoding: string;
}

interface TabProps {
    file: OpenFile;
    isActive: boolean;
    onClick: () => void;
    onClose: (event: React.MouseEvent) => void;
}

function Tab({ file, isActive, onClick, onClose }: TabProps) {
    // 获取文件图标
    // 如果是 new file (path is null)，当作文件处理
    const { iconPath } = getIcon(file.name, false);

    return (
        <div
            className={`tab-item ${isActive ? 'active' : ''} ${file.isDirty ? 'dirty' : ''}`}
            onClick={onClick}
            title={file.path || file.name} // 鼠标悬停显示完整路径
        >
            {/* 1. 顶部高亮条 (通过 CSS border-top 实现) */}

            {/* 2. 文件图标 */}
            <div className="tab-icon">
                <img src={iconPath} alt="" />
            </div>

            {/* 3. 文件名 */}
            <span className="tab-title">
                {file.name}
            </span>

            {/* 4. 右侧操作区：关闭按钮 或 未保存圆点 */}
            <div className="tab-actions">
                {/* 未保存时显示圆点 (CSS控制 hover 时隐藏圆点显示关闭) */}
                <span className="tab-dirty-dot">●</span>

                <button
                    className="close-tab-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose(e);
                    }}
                >
                    ×
                </button>
            </div>
        </div>
    );
}

interface TabsProps {
    files: OpenFile[];
    activeIndex: number;
    onTabClick: (index: number) => void;
    onTabClose: (index: number) => void;
}

export default function Tabs({ files, activeIndex, onTabClick, onTabClose }: TabsProps) {
    // 处理鼠标滚轮横向滚动
    const handleWheel = (e: React.WheelEvent) => {
        if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
        }
    };

    return (
        <div className="tabs-container" onWheel={handleWheel}>
            {files.map((file, index) => (
                <Tab
                    key={file.id}
                    file={file}
                    isActive={index === activeIndex}
                    onClick={() => onTabClick(index)}
                    onClose={(event) => onTabClose(index)}
                />
            ))}
        </div>
    );
}