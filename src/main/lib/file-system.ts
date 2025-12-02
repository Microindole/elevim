// src/main/lib/file-system.ts
import * as fs from 'node:fs/promises';
import * as path from 'path';
import { SearchOptions, ReplaceOptions, SearchResult } from '../../shared/types';

// --------------------------
// 1. 基础文件搜索/读取功能
// --------------------------

interface ProcessedEntry {
    name: string;
    path: string;
    children?: ProcessedEntry[];
}

export async function readDirectory(dirPath: string): Promise<ProcessedEntry[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const processedEntries = await Promise.all<ProcessedEntry>(
        entries.map(async (entry): Promise<ProcessedEntry> => {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === '.git' || entry.name === 'node_modules') return null as any;
                return {
                    name: entry.name,
                    path: fullPath,
                    children: await readDirectory(fullPath),
                };
            }
            return { name: entry.name, path: fullPath };
        })
    );
    const validEntries = processedEntries.filter(entry => entry !== null);
    validEntries.sort((a, b) => {
        const aIsDir = !!a.children;
        const bIsDir = !!b.children;
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.name.localeCompare(b.name);
    });
    return validEntries;
}

function createSearchRegex(options: SearchOptions): RegExp | null {
    const { searchTerm, isCaseSensitive, isRegex, isWholeWord } = options;
    let flags = 'g';
    if (!isCaseSensitive) flags += 'i';
    let finalSearchTerm = isRegex ? searchTerm : searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (isWholeWord && !isRegex) finalSearchTerm = `\\b${finalSearchTerm}\\b`;
    try {
        return new RegExp(finalSearchTerm, flags);
    } catch (e) {
        return null;
    }
}

export async function searchInDirectory(dirPath: string, options: SearchOptions, currentResults: SearchResult[] = []): Promise<SearchResult[]> {
    const ignoreList = ['.git', 'node_modules', '.DS_Store', 'dist', 'release'];
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.exe', '.ico'];
    const searchRegex = createSearchRegex(options);
    if (!searchRegex) return [];

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (ignoreList.includes(entry.name)) continue;
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                await searchInDirectory(fullPath, options, currentResults);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (binaryExtensions.includes(ext)) continue;
                try {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const lines = content.split('\n');
                    lines.forEach((lineText, index) => {
                        if (searchRegex.test(lineText)) {
                            currentResults.push({ filePath: fullPath, line: index + 1, match: lineText.trim() });
                        }
                        searchRegex.lastIndex = 0;
                    });
                } catch (readError) {}
            }
        }
    } catch (err) {}
    return currentResults;
}

export async function replaceInDirectory(
    dirPath: string,
    options: ReplaceOptions
): Promise<string[]> {
    const modifiedFiles: string[] = [];

    // 使用与搜索函数完全相同的忽略列表
    const ignoreList = ['.git', 'node_modules', '.DS_Store', 'release', 'dist'];
    const binaryExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.exe', '.appimage',
        '.deb', '.rpm', '.ico', '.asar'
    ];

    const { replaceTerm } = options;
    const searchRegex = createSearchRegex(options);
    if (!searchRegex) {
        return []; // 无效正则，不执行任何操作
    }

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
                        const content = await fs.readFile(fullPath, 'utf-8');

                        searchRegex.lastIndex = 0;
                        if (searchRegex?.test(content)) {
                            const newContent = content.replace(searchRegex, replaceTerm);
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

// --------------------------
// 2. 知识图谱核心逻辑 (修复版)
// --------------------------

export interface GraphData {
    nodes: Array<{ id: string; name: string; path: string; val: number }>;
    links: Array<{ source: string; target: string }>;
}

async function getAllMarkdownFiles(dirPath: string): Promise<string[]> {
    let results: string[] = [];
    try {
        const list = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of list) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
                results = results.concat(await getAllMarkdownFiles(fullPath));
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
                results.push(fullPath);
            }
        }
    } catch (e) {
        console.error(`Error reading dir ${dirPath}:`, e);
    }
    return results;
}

export async function buildKnowledgeGraph(rootPath: string): Promise<GraphData> {
    console.log('[Graph] Building graph for:', rootPath);
    const nodes: GraphData['nodes'] = [];
    const links: GraphData['links'] = [];
    const filePaths = await getAllMarkdownFiles(rootPath);

    // 建立节点映射：Key 为小写文件名(无后缀)，Value 为真实 ID
    const nodeMap = new Map<string, string>();

    // 1. 创建节点
    for (const filePath of filePaths) {
        const name = path.basename(filePath, path.extname(filePath)); // 移除 .md
        const id = name;

        nodes.push({
            id: id,
            name: name,
            path: filePath,
            val: 1
        });

        nodeMap.set(id.toLowerCase(), id);
    }

    // 2. 解析引用关系
    // 这个正则匹配 [[Target]] 或 [[Target|Alias]]
    const linkRegex = /\[\[([^|\]\n]+)(\|([^\]\n]+))?\]\]/g;

    for (const filePath of filePaths) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // 源文件 ID (无后缀)
            const sourceName = path.basename(filePath, path.extname(filePath));
            const sourceId = sourceName;

            const matches = content.matchAll(linkRegex);

            for (const match of matches) {
                let rawTarget = match[1].trim();

                // [关键修复]：如果链接写的是 [[a.md]]，这里去掉后缀变成 "a"
                let targetName = rawTarget.replace(/\.md$/i, "");
                let targetKey = targetName.toLowerCase();

                if (nodeMap.has(targetKey)) {
                    const realTargetId = nodeMap.get(targetKey)!;

                    if (sourceId !== realTargetId) {
                        links.push({
                            source: sourceId,
                            target: realTargetId
                        });
                    }
                }
            }
        } catch (e) {
            console.error(`[Graph] Failed to parse ${filePath}`, e);
        }
    }

    console.log(`[Graph] Built ${nodes.length} nodes, ${links.length} links.`);
    return { nodes, links };
}