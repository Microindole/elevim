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
// 2. 知识图谱核心逻辑 (Knowledge Graph)
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

    // 使用 Set 存储所有合法的节点 ID (全小写，用于忽略大小写匹配)
    // 同时也保留原始 ID 用于前端展示
    const nodeMap = new Map<string, string>(); // Key: lowercase-id, Value: original-id

    // 1. 创建节点
    for (const filePath of filePaths) {
        // ID 默认为文件名 (不含后缀)
        const name = path.basename(filePath, path.extname(filePath));
        const id = name; // 也可以用 filePath 作为 ID，但文件名更适合 WikiLink

        nodes.push({
            id: id,
            name: name,
            path: filePath,
            val: 1
        });

        // 存入 Map，Key 用小写，方便后续查找
        nodeMap.set(id.toLowerCase(), id);
    }

    console.log(`[Graph] Found ${nodes.length} nodes.`);

    // 2. 解析引用关系
    const linkRegex = /\[\[([^|\]\n]+)(\|([^\]\n]+))?\]\]/g;

    for (const filePath of filePaths) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const sourceName = path.basename(filePath, path.extname(filePath));
            const sourceId = sourceName;

            const matches = content.matchAll(linkRegex);

            for (const match of matches) {
                let rawTarget = match[1].trim();

                // 处理目标 ID：去掉可能的 .md 后缀
                let targetName = rawTarget.replace(/\.md$/i, "");
                let targetKey = targetName.toLowerCase();

                // 检查是否存在该节点 (忽略大小写)
                if (nodeMap.has(targetKey)) {
                    const realTargetId = nodeMap.get(targetKey)!;

                    // 避免自引用
                    if (sourceId !== realTargetId) {
                        links.push({
                            source: sourceId,
                            target: realTargetId
                        });
                    }
                } else {
                    // 调试日志：方便查看为什么没匹配上
                    // console.log(`[Graph] Link not found: [[${rawTarget}]] in ${sourceName}`);
                }
            }
        } catch (e) {
            console.error(`[Graph] Failed to parse ${filePath}`, e);
        }
    }

    console.log(`[Graph] Built ${links.length} links.`);
    return { nodes, links };
}