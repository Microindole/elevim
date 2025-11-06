// src/main/lib/file-system.ts
import * as fs from 'node:fs/promises';
import * as path from 'path';

interface ProcessedEntry {
    name: string;
    path: string;
    children?: ProcessedEntry[]; // 表示是目录
}

export async function readDirectory(dirPath: string): Promise<ProcessedEntry[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const processedEntries = await Promise.all<ProcessedEntry>(
        entries.map(async (entry): Promise<ProcessedEntry> => {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                // 忽略 .git 目录
                if (entry.name === '.git') {
                    return null as any;
                }
                return {
                    name: entry.name,
                    path: fullPath,
                    children: await readDirectory(fullPath), // 递归调用
                };
            }
            return {
                name: entry.name,
                path: fullPath,
            };
        })
    );
    const validEntries = processedEntries.filter(entry => entry !== null);

    validEntries.sort((a, b) => {
        const aIsDir = !!a.children; // 判断 a 是否是目录
        const bIsDir = !!b.children; // 判断 b 是否是目录

        if (aIsDir && !bIsDir) {
            return -1; // a (目录) 在前
        }
        if (!aIsDir && bIsDir) {
            return 1; // b (目录) 在前
        }

        return a.name.localeCompare(b.name);
    });
    return validEntries;
}

export interface SearchResult {
    filePath: string;
    line: number;
    match: string;
}

export async function searchInDirectory(
    dirPath: string,
    searchTerm: string,
    currentResults: SearchResult[] = []
): Promise<SearchResult[]> {

    // 简单的二进制/忽略列表
    const ignoreList = ['.git', 'node_modules', '.DS_Store'];
    const binaryExtensions = ['.png', '.jpg', '.jpeg',
        '.gif', '.exe', '.appimage', '.deb', '.rpm', '.ico', '.asar'];

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            if (ignoreList.includes(entry.name)) {
                continue; // 跳过忽略的文件夹/文件
            }

            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                // 递归搜索子目录
                await searchInDirectory(fullPath, searchTerm, currentResults);
            } else if (entry.isFile()) {
                // 检查是否为二进制文件
                const ext = path.extname(entry.name).toLowerCase();
                if (binaryExtensions.includes(ext)) {
                    continue;
                }

                // 尝试读取和搜索文件
                try {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const lines = content.split('\n');

                    lines.forEach((lineText, index) => {
                        if (lineText.toLowerCase().includes(searchTerm.toLowerCase())) {
                            currentResults.push({
                                filePath: fullPath, // 存完整路径
                                line: index + 1,
                                match: lineText.trim()
                            });
                        }
                    });
                } catch (readError) {
                    // 可能是权限问题或文件编码问题，忽略这个文件
                    console.warn(`[Search] Failed to read file: ${fullPath}`, readError);
                }
            }
        }
    } catch (err) {
        console.error(`[Search] Error reading directory: ${dirPath}`, err);
    }

    return currentResults;
}

export async function replaceInDirectory(
    dirPath: string,
    searchTerm: string,
    replaceTerm: string
): Promise<string[]> {
    const modifiedFiles: string[] = [];

    // 关键：使用与搜索函数完全相同的忽略列表
    const ignoreList = ['.git', 'node_modules', '.DS_Store', 'release', 'dist'];
    const binaryExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.exe', '.appimage',
        '.deb', '.rpm', '.ico', '.asar'
    ];

    // 创建一个不区分大小写的全局正则表达式
    const searchRegex = new RegExp(searchTerm, 'gi');

    // 递归替换的内部函数
    async function traverse(currentPath: string) {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                if (ignoreList.includes(entry.name)) {
                    continue;
                }

                const fullPath = path.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    await traverse(fullPath); // 递归
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (binaryExtensions.includes(ext)) {
                        continue;
                    }

                    try {
                        // 1. 读取文件
                        const content = await fs.readFile(fullPath, 'utf-8');

                        // 2. 检查是否有匹配项
                        if (searchRegex.test(content)) {
                            // 3. 执行替换
                            const newContent = content.replace(searchRegex, replaceTerm);

                            // 4. 写回文件
                            await fs.writeFile(fullPath, newContent, 'utf-8');
                            modifiedFiles.push(fullPath);
                        }
                    } catch (readWriteError) {
                        console.warn(`[Replace] Failed to read/write file: ${fullPath}`, readWriteError);
                    }
                }
            }
        } catch (err) {
            console.error(`[Replace] Error reading directory: ${currentPath}`, err);
        }
    }

    await traverse(dirPath);
    return modifiedFiles;
}