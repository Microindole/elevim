// src/main/lib/file-system.ts
import * as fs from 'node:fs/promises';
import * as path from 'path';

// 定义一个更明确的类型，与 FileNode 对应
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
                    // 返回一个特殊标记或者干脆过滤掉，这里选择返回 null 稍后过滤
                    return null as any; // 临时用 any，下面会过滤
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
                // 文件没有 children 属性
            };
        })
    );

    // 过滤掉 null 条目 (比如 .git 目录)
    const validEntries = processedEntries.filter(entry => entry !== null);

    // --- 添加排序逻辑 ---
    validEntries.sort((a, b) => {
        const aIsDir = !!a.children; // 判断 a 是否是目录
        const bIsDir = !!b.children; // 判断 b 是否是目录

        // 规则 1: 文件夹排在文件前面
        if (aIsDir && !bIsDir) {
            return -1; // a (目录) 在前
        }
        if (!aIsDir && bIsDir) {
            return 1; // b (目录) 在前
        }

        // 规则 2: 如果都是文件夹或都是文件，按名称字母顺序排序
        return a.name.localeCompare(b.name);
    });
    // --- 排序逻辑结束 ---

    return validEntries; // 返回排序后的结果
}