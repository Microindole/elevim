import React from 'react';
import './Breadcrumbs.css';

// 重新定义简单的接口，不再依赖旧文件
export interface BreadcrumbItem {
    name: string;
    kind?: string;
    startPos?: number; // Monaco 使用 lineNumber/column，这里暂时保留作为占位
}

interface BreadcrumbsProps {
    filePath: string | null;
    projectPath: string | null;
    symbols: BreadcrumbItem[]; // 现在由父组件传入
    onItemClick: (item: BreadcrumbItem) => void;
    onFileSelect: (path: string) => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
                                                     filePath,
                                                     projectPath,
                                                     symbols,
                                                     onItemClick
                                                 }) => {
    // 简单的路径显示逻辑
    const getRelPath = () => {
        if (!filePath || !projectPath) return [];
        // 简单计算相对路径用于显示
        const rel = filePath.startsWith(projectPath)
            ? filePath.slice(projectPath.length).replace(/^[/\\]/, '')
            : filePath;
        return rel.split(/[/\\]/);
    };

    const pathParts = getRelPath();

    return (
        <div className="breadcrumbs-container">
            <div className="breadcrumb-path">
                {pathParts.map((part, index) => (
                    <span key={index} className="breadcrumb-segment">
                        {part}
                        {index < pathParts.length - 1 && <span className="separator">/</span>}
                    </span>
                ))}
            </div>

            {/* 如果有符号（函数/类名），显示在后面 */}
            {symbols.length > 0 && <span className="separator">›</span>}
            {symbols.map((item, index) => (
                <span key={index} className="breadcrumb-symbol" onClick={() => onItemClick(item)}>
                    {item.name}
                    {index < symbols.length - 1 && <span className="separator">›</span>}
                </span>
            ))}
        </div>
    );
};

export default Breadcrumbs;