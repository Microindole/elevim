// src/renderer/components/Breadcrumbs/Breadcrumbs.tsx
import React, { useState, useRef, useEffect } from 'react';
import './Breadcrumbs.css';
import { BreadcrumbItem } from '../../../main/lib/breadcrumbs-util';
// 确保引入路径正确，根据你的文件结构调整
import { getIcon } from '../FileTree/icon-map';

interface BreadcrumbsProps {
    filePath: string | null;
    projectPath: string | null;
    symbols: BreadcrumbItem[];
    onItemClick: (item: BreadcrumbItem) => void;
    onFileSelect: (path: string) => void;
}

// 扩展 BreadcrumbItem 类型以包含完整路径
interface BreadcrumbPathItem extends BreadcrumbItem {
    fullPath: string;
}

export default function Breadcrumbs({ filePath, projectPath, symbols, onItemClick, onFileSelect }: BreadcrumbsProps) {
    if (!filePath) return <div className="breadcrumbs-container empty"></div>;

    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [dropdownItems, setDropdownItems] = useState<{name: string, path: string, isDir: boolean}[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- 核心修复：准确计算路径 ---
    const getPathItems = (): BreadcrumbPathItem[] => {
        const items: BreadcrumbPathItem[] = [];

        // 统一路径分隔符
        const normalizedFilePath = filePath.replace(/\\/g, '/');
        const normalizedProjectPath = projectPath ? projectPath.replace(/\\/g, '/') : null;

        if (normalizedProjectPath && normalizedFilePath.startsWith(normalizedProjectPath)) {
            // --- 情况 A: 项目内文件 ---

            // 1. 添加根项目目录
            const projectName = normalizedProjectPath.split('/').pop() || 'Project';
            items.push({
                type: 'dir',
                name: projectName,
                fullPath: normalizedProjectPath
            });

            // 2. 处理中间路径
            // 获取相对路径部分，例如 "/src/components/App.tsx"
            const relativePart = normalizedFilePath.substring(normalizedProjectPath.length);
            // 分割并过滤空字符串
            const parts = relativePart.split('/').filter(p => p.length > 0);

            let currentAccumulatedPath = normalizedProjectPath;

            parts.forEach((part, index) => {
                currentAccumulatedPath += `/${part}`;
                const isLast = index === parts.length - 1;

                items.push({
                    type: isLast ? 'file' : 'dir', // 最后一个是当前文件
                    name: part,
                    fullPath: currentAccumulatedPath
                });
            });
        } else {
            // --- 情况 B: 项目外文件 (或未打开文件夹) ---
            // 简单处理：直接显示文件名，不支持上层导航（或者你可以实现完整系统路径分割）
            const parts = normalizedFilePath.split('/');
            const fileName = parts[parts.length - 1];
            // 如果是在 Windows 根目录下，parts[0] 可能是 "C:"

            // 这里简单起见，我们只显示文件名本身，或者你可以尝试解析父级
            // 为了让它能工作，我们至少放入当前文件
            items.push({
                type: 'file',
                name: fileName,
                fullPath: normalizedFilePath
            });
        }
        return items;
    };

    const fileItems = getPathItems();

    // --- 核心修复：点击事件处理 ---
    const onBreadcrumbClick = async (index: number, item: BreadcrumbPathItem) => {
        // 如果点击的是当前打开的下拉菜单，则关闭
        if (activeDropdown === index) {
            setActiveDropdown(null);
            return;
        }

        // 确定要读取的目录路径
        let dirToRead = "";

        if (item.type === 'file') {
            // 如果点击的是文件（通常是最后一个），我们显示它所在目录的同级文件
            // 去掉文件名，获取父目录
            const lastSlashIndex = item.fullPath.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                dirToRead = item.fullPath.substring(0, lastSlashIndex);
            } else {
                return; // 无法解析父目录
            }
        } else {
            // 如果点击的是目录，直接读取这个目录下的内容
            dirToRead = item.fullPath;
        }

        try {
            // 请求主进程读取目录
            const result = await window.electronAPI.file.readDirectory(dirToRead);

            if (result && result.children) {
                const siblings = result.children.map((child: any) => ({
                    name: child.name,
                    path: child.path, // 这里 file-system.ts 返回的 path 应该是完整路径
                    isDir: !!child.children // 或者是根据 file-system 返回的类型判断
                })).sort((a: any, b: any) => {
                    // 文件夹排在前面
                    if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
                    return a.isDir ? -1 : 1;
                });

                setDropdownItems(siblings);
                setActiveDropdown(index); // 显示下拉菜单
            }
        } catch (e) {
            console.error("Failed to read directory:", dirToRead, e);
        }
    };

    return (
        <div className="breadcrumbs-container" ref={dropdownRef}>
            {fileItems.map((item, index) => {
                // 获取图标
                const { iconPath } = getIcon(item.name, item.type === 'dir');

                return (
                    <React.Fragment key={item.fullPath || index}>
                        <div className="breadcrumb-wrapper" style={{position: 'relative'}}>
                            <div
                                className={`breadcrumb-item ${item.type} ${activeDropdown === index ? 'active' : ''}`}
                                onClick={() => onBreadcrumbClick(index, item)}
                            >
                                <span className="breadcrumb-icon">
                                    <img src={iconPath} alt="" />
                                </span>
                                <span className="breadcrumb-name">{item.name}</span>
                            </div>

                            {/* 下拉菜单渲染 */}
                            {activeDropdown === index && (
                                <div className="breadcrumb-dropdown">
                                    {dropdownItems.length === 0 ? (
                                        <div className="dropdown-empty">Empty</div>
                                    ) : (
                                        dropdownItems.map((subItem) => {
                                            const subIcon = getIcon(subItem.name, subItem.isDir).iconPath;
                                            return (
                                                <div
                                                    key={subItem.path}
                                                    className="dropdown-item"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // 防止冒泡
                                                        if (!subItem.isDir) {
                                                            onFileSelect(subItem.path);
                                                            setActiveDropdown(null);
                                                        }
                                                        // 如果是目录，VS Code 的行为通常是不做操作或进入下一级
                                                        // 这里暂时只支持打开文件
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
                        <span className="breadcrumb-separator">›</span>
                    </React.Fragment>
                );
            })}

            {/* 符号部分保持不变 */}
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
        </div>
    );
}