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

export async function replaceInDirectory(dirPath: string, options: ReplaceOptions): Promise<string[]> {
    return []; // 暂不使用
}

// --------------------------
// 2. 知识图谱核心逻辑
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
    const nodeMap = new Map<string, string>();

    for (const filePath of filePaths) {
        const name = path.basename(filePath, path.extname(filePath));
        const id = name;
        nodes.push({ id: id, name: name, path: filePath, val: 1 });
        nodeMap.set(id.toLowerCase(), id);
    }

    const linkRegex = /\[\[([^|\]\n]+)(\|([^\]\n]+))?\]\]/g;

    for (const filePath of filePaths) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const sourceName = path.basename(filePath, path.extname(filePath));
            const sourceId = sourceName;

            const matches = content.matchAll(linkRegex);
            for (const match of matches) {
                let rawTarget = match[1].trim();
                let targetName = rawTarget.replace(/\.md$/i, "");
                let targetKey = targetName.toLowerCase();

                if (nodeMap.has(targetKey)) {
                    const realTargetId = nodeMap.get(targetKey)!;
                    if (sourceId !== realTargetId) {
                        links.push({ source: sourceId, target: realTargetId });
                    }
                }
            }
        } catch (e) {
            console.error(`[Graph] Failed to parse ${filePath}`, e);
        }
    }

    return { nodes, links };
}

// --------------------------
// 3. 智能重命名 (Auto-update Links)
// --------------------------

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function renameFileWithLinks(rootPath: string, oldPath: string, newPath: string): Promise<{ success: boolean, modifiedCount: number, modifiedPaths: string[], error?: string }> {
    try {
        // 1. 执行物理重命名
        await fs.rename(oldPath, newPath);

        if (!oldPath.toLowerCase().endsWith('.md')) {
            return { success: true, modifiedCount: 0, modifiedPaths: [] };
        }

        // 2. 准备链接替换逻辑
        const oldName = path.basename(oldPath, '.md');
        const newName = path.basename(newPath, '.md');

        // 匹配 [[Old 后面紧跟着 ] 或 . 或 |
        const linkRegex = new RegExp(`(\\[\\[)${escapeRegExp(oldName)}(?=[\\|\\]\\.])`, 'g');

        // 3. 扫描所有 Markdown 文件进行替换
        const allFiles = await getAllMarkdownFiles(rootPath);
        let modifiedCount = 0;
        const modifiedPaths: string[] = []; // 记录修改的文件路径

        for (const filePath of allFiles) {
            if (filePath === newPath) continue;

            try {
                const content = await fs.readFile(filePath, 'utf-8');
                if (linkRegex.test(content)) {
                    const newContent = content.replace(linkRegex, `$1${newName}`);
                    await fs.writeFile(filePath, newContent, 'utf-8');

                    modifiedCount++;
                    modifiedPaths.push(filePath);
                    console.log(`[AutoUpdate] Updated links in: ${path.basename(filePath)}`);
                }
            } catch (err) {
                console.error(`[AutoUpdate] Failed to update file: ${filePath}`, err);
            }
        }

        return { success: true, modifiedCount, modifiedPaths };

    } catch (error: any) {
        console.error('[Rename] Error:', error);
        return { success: false, modifiedCount: 0, modifiedPaths: [], error: error.message };
    }
}