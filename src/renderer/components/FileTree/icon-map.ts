// src/renderer/components/FileTree/icon-map.ts
import { generateManifest } from 'material-icon-theme';

// 生成图标映射配置
const manifest = generateManifest({});

/**
 * 根据文件名、是否为目录、是否展开来获取图标路径
 */
export const getIcon = (name: string, isDirectory?: boolean, isOpen?: boolean) => {
    let iconName: string;

    if (isDirectory) {
        // 从 manifest 中查找文件夹图标
        const folderNames = manifest.folderNames || {};
        const folderNamesExpanded = manifest.folderNamesExpanded || {};

        const lowerName = name.toLowerCase();

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
        // 从 manifest 中查找文件图标
        const fileExtensions = manifest.fileExtensions || {};
        const fileNames = manifest.fileNames || {};

        const lowerName = name.toLowerCase();

        // 先检查完整文件名
        if (fileNames[lowerName]) {
            iconName = fileNames[lowerName];
        } else {
            // 再检查扩展名
            const extension = lowerName.split('.').pop() || '';
            iconName = fileExtensions[extension] || manifest.file || 'file';
        }
    }

    // 返回图标路径，使用自定义协议
    return {
        iconPath: `material-icon://${iconName}.svg`,
        color: undefined
    };
};