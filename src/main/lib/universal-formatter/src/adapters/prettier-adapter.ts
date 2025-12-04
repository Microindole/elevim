import * as prettier from 'prettier';
import * as path from 'path';
import { IFormatter, FormatOptions } from '../interfaces';

export class PrettierFormatter implements IFormatter {
  name = 'Prettier';

  private supportedExtensions = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.json', 
    '.css', '.scss', '.less', '.html', '.md', 
    '.yaml', '.yml', '.graphql', 
    '.java' 
  ]);

  canFormat(filePath: string, language?: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (language === 'java' || ext === '.java') return true;
    return this.supportedExtensions.has(ext);
  }

  async format(options: FormatOptions): Promise<string> {
    try {
      const config = await prettier.resolveConfig(options.filePath);
      
      const finalConfig = config || {
        tabWidth: 2, 
        printWidth: 100,
      };

      const plugins = [];
      let parser = undefined;

      // ✅ 修复点 1：智能加载 Java 插件 (处理 default 导出问题)
      if (options.filePath.endsWith('.java') || options.language === 'java') {
          try {
              const javaPluginReq = require('prettier-plugin-java');
              // 关键：如果存在 .default，说明是 ESM 兼容包，必须取 .default
              const javaPlugin = javaPluginReq.default || javaPluginReq;
              plugins.push(javaPlugin);
              
              // ✅ 修复点 2：显式指定 parser，不依赖文件推断
              parser = 'java';
          } catch (e) {
              console.error("❌ Failed to load prettier-plugin-java:", e);
          }
      }

      return await prettier.format(options.content, {
        ...finalConfig,
        filepath: options.filePath,
        parser: parser, // 显式传递 parser
        plugins: plugins,
      });

    } catch (error) {
      console.error(`[Prettier] Error formatting ${options.filePath}:`, error);
      // 出错返回原始内容，避免流程中断
      return options.content;
    }
  }
}