// src/renderer/features/explorer/components/FileTree/icon-map.ts
import { generateManifest } from 'material-icon-theme';

// 生成图标映射配置
const manifest = generateManifest({});

// 1. 手动补充可能缺失的常用映射
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

// 2. 高优先级自定义模式映射
// 这里专门处理那些 manifest 可能映射不准，或者需要修正图标名的情况 (如 .clone)
const customPatterns: Record<string, string> = {
    // 架构模式
    'service.ts': 'angular-service.clone',
    'service.js': 'angular-service.clone',
    'service.tsx': 'angular-service.clone',
    'service.jsx': 'angular-service.clone',

    'component.ts': 'angular-component',
    'component.js': 'angular-component',
    'component.tsx': 'angular-component', // React 组件也常用这个图标
    'component.jsx': 'angular-component',

    'guard.ts': 'angular-guard',
    'guard.js': 'angular-guard',
    'pipe.ts': 'angular-pipe',
    'directive.ts': 'angular-directive',
    'resolver.ts': 'angular-resolver',

    // 测试文件
    'test.ts': 'test-ts',
    'test.tsx': 'test-ts',
    'spec.ts': 'test-ts',
    'spec.tsx': 'test-ts',
    'test.js': 'test-js',
    'spec.js': 'test-js',

    // 配置文件
    'config.ts': 'settings',
    'config.js': 'settings',
    'config.json': 'settings',

    // 其他常用语义
    'api.ts': 'http',
    'interface.ts': 'typescript-def',
    'd.ts': 'typescript-def', // 确保 .d.ts 优先于 .ts
};

// 3. 关键字模糊匹配
// 当所有后缀都匹配失败时，检查文件名中是否包含这些关键字
const keywordMap: Record<string, string> = {
    'config': 'settings',
    'settings': 'settings',
    'util': 'javascript-map',
    'utils': 'javascript-map',
    'service': 'angular-service.clone',
    'component': 'angular-component',
    'test': 'test-ts',
    'docker': 'docker',
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
        // --- 文件处理逻辑 ---
        const fileExtensions = manifest.fileExtensions || {};
        const fileNames = manifest.fileNames || {};

        // 1. 优先检查完整文件名 (例如 package.json, .gitignore)
        if (fileNames[lowerName]) {
            iconName = fileNames[lowerName];
        } else {
            // 2. 检查扩展名 (支持多级扩展名，从长到短匹配)
            const parts = lowerName.split('.');

            // 从最长的后缀开始尝试匹配
            // 例如 "app.service.ts" -> 先试 "service.ts", 再试 "ts"
            for (let i = 1; i < parts.length; i++) {
                const ext = parts.slice(i).join('.');

                // A. [新增] 最优先：查自定义模式 (修复 service, test 等语义)
                if (customPatterns[ext]) {
                    iconName = customPatterns[ext];
                    break;
                }

                // B. 查 Manifest (官方映射)
                if (fileExtensions[ext]) {
                    iconName = fileExtensions[ext];

                    // [鲁棒性修复] 拦截官方可能返回的错误图标名 (如 angular-service)
                    // 如果 manifest 返回了 angular-service，我们强制纠正为 .clone
                    if (iconName === 'angular-service') {
                        iconName = 'angular-service.clone';
                    }
                    break;
                }

                // C. 查手动补充的基础映射
                if (extraExtensions[ext]) {
                    iconName = extraExtensions[ext];
                    break;
                }
            }

            // 3. 如果后缀匹配都失败了，尝试关键字匹配
            // 处理例如 my_config_file.txt 这种没有标准后缀但有语义的情况
            if (!iconName) {
                for (const [key, icon] of Object.entries(keywordMap)) {
                    if (lowerName.includes(key) || lowerName.includes(`.${key}.`)) {
                        iconName = icon;
                        break;
                    }
                }
            }

            // 4. 如果还没找到，使用默认文件图标
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