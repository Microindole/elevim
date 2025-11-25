// src/renderer/components/FileTree/icon-map.ts
import { generateManifest } from 'material-icon-theme';

// 生成图标映射配置
const manifest = generateManifest({});

// 手动补充可能缺失的常用映射
// material-icon-theme 有时依赖 Language ID，导致这些基础后缀在 fileExtensions 中缺失
const extraExtensions: Record<string, string> = {
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    ts: 'typescript',
    mts: 'typescript',
    cts: 'typescript',
    jsx: 'react',
    tsx: 'react_ts',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown'
};

/**
 * 根据文件名、是否为目录、是否展开来获取图标路径
 */
export const getIcon = (name: string, isDirectory?: boolean, isOpen?: boolean) => {
    let iconName: string | undefined;
    const lowerName = name.toLowerCase();

    if (isDirectory) {
        // --- 文件夹处理逻辑 ---
        const folderNames = manifest.folderNames || {};
        const folderNamesExpanded = manifest.folderNamesExpanded || {};

        if (isOpen && folderNamesExpanded[lowerName]) {
            iconName = folderNamesExpanded[lowerName];
        } else if (folderNames[lowerName]) {
            iconName = folderNames[lowerName];
        } else if (isOpen && manifest.folderExpanded) {
            iconName = manifest.folderExpanded;
        } else {
            iconName = manifest.folder || 'folder';
        }
    } else {
        // --- 文件处理逻辑 (增强版) ---
        const fileExtensions = manifest.fileExtensions || {};
        const fileNames = manifest.fileNames || {};

        // 1. 优先检查完整文件名 (例如 package.json, .gitignore)
        if (fileNames[lowerName]) {
            iconName = fileNames[lowerName];
        } else {
            // 2. 检查扩展名 (支持多级扩展名，如 .test.js)
            const parts = lowerName.split('.');

            // 从最长的后缀开始尝试匹配
            // 例如 "app.test.tsx" -> 先试 "test.tsx", 再试 "tsx"
            for (let i = 1; i < parts.length; i++) {
                const ext = parts.slice(i).join('.');

                // A. 先查 Manifest
                if (fileExtensions[ext]) {
                    iconName = fileExtensions[ext];
                    break;
                }
                // B. 再查手动补充的映射
                if (extraExtensions[ext]) {
                    iconName = extraExtensions[ext];
                    break;
                }
            }

            // 3. 如果都没找到，使用默认文件图标
            if (!iconName) {
                iconName = manifest.file || 'file';
            }
        }
    }

    // 兜底防止 undefined
    if (!iconName) {
        iconName = 'file';
    }

    return {
        iconPath: `material-icon://${iconName}.svg`,
        color: undefined
    };
};