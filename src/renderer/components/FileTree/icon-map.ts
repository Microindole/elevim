// src/renderer/components/FileTree/icon-map.ts
import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js';

/**
 * 根据文件名、是否为目录、是否展开来获取图标路径
 */
export const getIcon = (name: string, isDirectory?: boolean, isOpen?: boolean) => {
    let iconPath: string;

    if (isDirectory) {
        // 文件夹：如果是展开的，获取展开图标，否则获取闭合图标
        iconPath = isOpen ? getIconForOpenFolder(name) : getIconForFolder(name);
    } else {
        // 文件：获取文件图标
        iconPath = getIconForFile(name);
    }

    // iconPath 返回的是 "icons/file_type_js.svg" 这样的
    // 我们需要让它成为相对于 index.html 的路径
    // 由于 index.html 和 vscode-icons 文件夹都在根目录，
    // 我们使用 "./" 来表示相对路径。
    return {
        iconPath: `./vscode-icons/${iconPath}`,
        color: undefined // 我们不再需要颜色，因为 SVG 图标自带颜色
    };
};