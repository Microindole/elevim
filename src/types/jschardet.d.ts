// src/types/jschardet.d.ts
// 这是一个手动声明文件，因为 jschardet 库没有提供 @types

declare module 'jschardet' {
    /**
     * 检测结果
     */
    interface DetectionResult {
        /** 识别出的编码 (例如 'utf-8', 'GB2312') */
        encoding: string;
        /** 置信度 (0 到 1.0) */
        confidence: number;
    }

    /**
     * 从 Buffer 检测编码
     * @param buffer 要检测的 Node.js Buffer
     * @returns 返回检测结果对象，如果无法识别则返回 null
     */
    function detect(buffer: Buffer): DetectionResult | null;
}