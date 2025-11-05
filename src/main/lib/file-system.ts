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