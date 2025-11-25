// src/renderer/components/Breadcrumbs/Breadcrumbs.tsx
import React, { useState, useRef, useEffect } from 'react';
import './Breadcrumbs.css';
import { BreadcrumbItem } from '../../../main/lib/breadcrumbs-util';
import { getIcon } from '../FileTree/icon-map';

interface BreadcrumbsProps {
    filePath: string | null;
    projectPath: string | null;
    symbols: BreadcrumbItem[];
    onItemClick: (item: BreadcrumbItem) => void;
    onFileSelect: (path: string) => void;
}

interface BreadcrumbPathItem extends BreadcrumbItem {
    fullPath: string;
}

export default function Breadcrumbs({ filePath, projectPath, symbols, onItemClick, onFileSelect }: BreadcrumbsProps) {
    if (!filePath) return <div className="breadcrumbs-container empty"></div>;

    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [dropdownItems, setDropdownItems] = useState<{name: string, path: string, isDir: boolean}[]>([]);
    // 存储下拉菜单的坐标
    const [dropdownPos, setDropdownPos] = useState<{ top: number, left: number } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // 检查点击是否在任何 .breadcrumb-item 或 .breadcrumb-dropdown 内
            if ((event.target as Element).closest('.breadcrumb-dropdown') ||
                (event.target as Element).closest('.breadcrumb-item')) {
                return;
            }
            setActiveDropdown(null);
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- 1. 路径解析逻辑 (增强版：支持外部文件完整路径) ---
    const getPathItems = (): BreadcrumbPathItem[] => {
        const items: BreadcrumbPathItem[] = [];
        const normalizedFilePath = filePath.replace(/\\/g, '/');
        const normalizedProjectPath = projectPath ? projectPath.replace(/\\/g, '/') : null;

        if (normalizedProjectPath && normalizedFilePath.startsWith(normalizedProjectPath)) {
            // --- A. 项目内文件 ---
            const projectName = normalizedProjectPath.split('/').pop() || 'Project';
            items.push({ type: 'dir', name: projectName, fullPath: normalizedProjectPath });

            const relativePart = normalizedFilePath.substring(normalizedProjectPath.length);
            const parts = relativePart.split('/').filter(p => p.length > 0);

            let currentPath = normalizedProjectPath;
            parts.forEach((part, index) => {
                currentPath += `/${part}`;
                const isLast = index === parts.length - 1;
                items.push({
                    type: isLast ? 'file' : 'dir',
                    name: part,
                    fullPath: currentPath
                });
            });
        } else {
            // --- B. 外部文件 (完整系统路径) ---
            // 例如: C:/Users/Admin/Desktop/test.txt
            const parts = normalizedFilePath.split('/');

            let currentAccumulated = "";

            parts.forEach((part, index) => {
                if (part === "") return; // 忽略空，但要注意 Linux 根路径

                // 简单的路径累加
                // 如果是 index 0 (如 "C:"), current = "C:"
                // 如果是后续 (如 "Users"), current = "C:/Users"
                if (index === 0) {
                    currentAccumulated = part;
                } else {
                    currentAccumulated += `/${part}`;
                }

                const isLast = index === parts.length - 1;
                items.push({
                    type: isLast ? 'file' : 'dir',
                    name: part,
                    fullPath: currentAccumulated
                });
            });
        }
        return items;
    };

    const fileItems = getPathItems();

    // --- 2. 点击事件：计算位置并读取目录 ---
    const onBreadcrumbClick = async (e: React.MouseEvent, index: number, item: BreadcrumbPathItem) => {
        e.stopPropagation();

        if (activeDropdown === index) {
            setActiveDropdown(null);
            return;
        }

        // 计算下拉菜单的位置 (Fixed Positioning)
        const rect = e.currentTarget.getBoundingClientRect();
        setDropdownPos({
            top: rect.bottom + 4, // 在元素下方 4px
            left: rect.left
        });

        let dirToRead = "";
        if (item.type === 'file') {
            // 如果是文件，列出同级目录
            const lastSlash = item.fullPath.lastIndexOf('/');
            dirToRead = item.fullPath.substring(0, lastSlash);
        } else {
            dirToRead = item.fullPath;
        }

        try {
            // @ts-ignore (如果 TS 报错说 readDirectoryFlat 不存在，因为没更新类型定义)
            const result = await window.electronAPI.file.readDirectoryFlat(dirToRead);

            if (result && result.children) {
                setDropdownItems(result.children);
                setActiveDropdown(index);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="breadcrumbs-container" ref={containerRef}>
            {fileItems.map((item, index) => {
                const { iconPath } = getIcon(item.name, item.type === 'dir');

                return (
                    <React.Fragment key={item.fullPath || index}>
                        <div
                            className={`breadcrumb-item ${item.type} ${activeDropdown === index ? 'active' : ''}`}
                            onClick={(e) => onBreadcrumbClick(e, index, item)}
                        >
                            <span className="breadcrumb-icon">
                                <img src={iconPath} alt="" />
                            </span>
                            <span className="breadcrumb-name">{item.name}</span>
                        </div>

                        {/* 分隔符 */}
                        {index < fileItems.length + symbols.length - 1 && (
                            <span className="breadcrumb-separator">›</span>
                        )}
                    </React.Fragment>
                );
            })}

            {/* 符号部分 (暂不加下拉) */}
            {symbols.map((item, index) => (
                <React.Fragment key={`symbol-${index}`}>
                    <div
                        className={`breadcrumb-item symbol`}
                        onClick={() => onItemClick(item)}
                    >
                        <span className="breadcrumb-icon symbol-icon">ƒ</span>
                        <span className="breadcrumb-name">{item.name}</span>
                    </div>
                    {index < symbols.length - 1 && (
                        <span className="breadcrumb-separator">›</span>
                    )}
                </React.Fragment>
            ))}

            {/* 下拉菜单 (渲染在最外层，利用 Fixed 定位)
                注意：这里我们只渲染一个全局的下拉菜单，根据 activeDropdown 显示
            */}
            {activeDropdown !== null && dropdownPos && (
                <div
                    className="breadcrumb-dropdown"
                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                    {dropdownItems.length === 0 ? (
                        <div className="dropdown-empty">Empty or Loading...</div>
                    ) : (
                        dropdownItems.map((subItem) => {
                            // 获取下拉列表项的图标
                            const subIcon = getIcon(subItem.name, subItem.isDir).iconPath;
                            return (
                                <div
                                    key={subItem.path}
                                    className="dropdown-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!subItem.isDir) {
                                            onFileSelect(subItem.path);
                                            setActiveDropdown(null);
                                        }
                                        // 如果是文件夹，VS Code 行为是不打开。如果想支持导航，需要在这里递归更新面包屑状态，比较复杂。
                                        // 暂时保持点击文件打开即可。
                                    }}
                                >
                                    <img src={subIcon} alt="" className="dropdown-icon" />
                                    <span className="dropdown-text">{subItem.name}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}