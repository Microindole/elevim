// src/renderer/components/Tabs/Tabs.tsx
import React from 'react';
import './Tabs.css';

// 定义一个打开文件的对象接口，我们将在 App.tsx 中复用它
export interface OpenFile {
    path: string | null;
    name: string;
    content: string;
    isDirty: boolean;
}

interface TabProps {
    file: OpenFile;
    isActive: boolean;
    onClick: () => void;
    onClose: (event: React.MouseEvent) => void;
}

// 单个标签页组件
function Tab({ file, isActive, onClick, onClose }: TabProps) {
    const dirtyMarker = file.isDirty ? '•' : '';
    return (
        <div className={`tab-item ${isActive ? 'active' : ''}`} onClick={onClick}>
            <span className="tab-title">{`${file.name} ${dirtyMarker}`}</span>
            <button className="close-tab-btn" onClick={onClose}>×</button>
        </div>
    );
}

// 标签页容器组件
interface TabsProps {
    files: OpenFile[];
    activeIndex: number;
    onTabClick: (index: number) => void;
    onTabClose: (index: number) => void;
}

export default function Tabs({ files, activeIndex, onTabClick, onTabClose }: TabsProps) {
    return (
        <div className="tabs-container">
            {files.map((file, index) => (
                <Tab
                    key={file.path || `untitled-${index}`} // 使用唯一 key
                    file={file}
                    isActive={index === activeIndex}
                    onClick={() => onTabClick(index)}
                    onClose={(event) => {
                        event.stopPropagation(); // 阻止事件冒泡到父 div 的 onClick
                        onTabClose(index);
                    }}
                />
            ))}
        </div>
    );
}