import { IFormatter, FormatOptions } from './interfaces';
import { PrettierFormatter } from './adapters/prettier-adapter';
import { ClangFormatter } from './adapters/clang-adapter';

export class FormatterEngine {
  private formatters: IFormatter[] = [];

  constructor() {
    // 注册所有支持的格式化器
    this.register(new PrettierFormatter());
    this.register(new ClangFormatter());
  }

  private register(formatter: IFormatter) {
    this.formatters.push(formatter);
  }

  /**
   * 主要的公共 API
   */
  async formatCode(filePath: string, content: string, language?: string): Promise<string> {
    // 查找第一个匹配的格式化器
    const formatter = this.formatters.find(f => f.canFormat(filePath, language));

    if (!formatter) {
      console.log(`⚠️  No formatter found for: ${filePath}`);
      return content; // 找不到则原样返回
    }

    // console.log(`✨ Using [${formatter.name}] for: ${filePath}`);

    try {
      return await formatter.format({ filePath, content, language });
    } catch (error) {
      console.error(`❌ Format failed:`, error);
      return content; // 出错时返回原始内容是编辑器的最佳实践
    }
  }
}