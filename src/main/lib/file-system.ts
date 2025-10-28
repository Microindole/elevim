// src/main/lib/file-system.ts
import * as fs from 'node:fs/promises';
import * as path from 'path';

export async function readDirectory(dirPath: string): Promise<any[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                return {
                    name: entry.name,
                    path: fullPath,
                    children: await readDirectory(fullPath),
                };
            }
            return {
                name: entry.name,
                path: fullPath,
            };
        })
    );
    return files.filter(file => !file.name.startsWith('.'));
}