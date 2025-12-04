export interface FormatOptions {
  filePath: string;       // 文件路径 (这对查找配置文件 .clang-format/.prettierrc 至关重要)
  content: string;        // 代码内容
  language?: string;      // 显式指定语言 (可选，如 'java', 'typescript')
}

export interface IFormatter {
  name: string;
  // 判断是否能处理该文件
  canFormat(filePath: string, language?: string): boolean;
  // 执行格式化
  format(options: FormatOptions): Promise<string>;
}