// src/main/services/linterService.ts

/**
 * 统一的诊断信息类型
 */
export interface LintDiagnostic {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    ruleId: string | null;
    source?: string; // 例如 "eslint", "pylint", "typescript"
}

/**
 * Linter 接口 - 所有语言的 linter 都要实现这个接口
 */
export interface ILinter {
    name: string;
    supportedExtensions: string[];
    lint(code: string, filename: string): Promise<LintDiagnostic[]>;
}

/**
 * Linter 注册表
 */
class LinterRegistry {
    private linters: Map<string, ILinter> = new Map();

    /**
     * 注册一个 linter
     */
    register(linter: ILinter): void {
        for (const ext of linter.supportedExtensions) {
            this.linters.set(ext.toLowerCase(), linter);
            console.log(`[Linter Registry] Registered ${linter.name} for .${ext}`);
        }
    }

    /**
     * 根据文件扩展名获取对应的 linter
     */
    getLinter(filename: string): ILinter | null {
        const ext = this.getExtension(filename);
        if (!ext) return null;
        return this.linters.get(ext) || null;
    }

    /**
     * 获取文件扩展名
     */
    private getExtension(filename: string): string | null {
        const match = filename.match(/\.([^.]+)$/);
        return match ? match[1].toLowerCase() : null;
    }

    /**
     * 检查是否支持该文件
     */
    isSupported(filename: string): boolean {
        return this.getLinter(filename) !== null;
    }
}

// 创建全局注册表实例
export const linterRegistry = new LinterRegistry();

/**
 * 主 lint 函数 - 自动选择合适的 linter
 */
export async function lintCode(
    code: string,
    filename: string
): Promise<LintDiagnostic[]> {
    const linter = linterRegistry.getLinter(filename);

    if (!linter) {
        console.log(`[Linter] No linter found for: ${filename}`);
        return [];
    }

    try {
        console.log(`[Linter] Using ${linter.name} for ${filename}`);
        const diagnostics = await linter.lint(code, filename);
        console.log(`[Linter] Found ${diagnostics.length} issues`);
        return diagnostics;
    } catch (error) {
        console.error(`[Linter] Error in ${linter.name}:`, error);
        return [];
    }
}

/**
 * 初始化所有 linters
 */
export async function initializeLinters(): Promise<void> {
    console.log('[Linter] Initializing linters...');

    // JavaScript/JSX
    try {
        const { JavaScriptLinter } = await import('./linters/javascriptLinter');
        linterRegistry.register(new JavaScriptLinter());
        console.log('[Linter] ✓ JavaScript linter loaded');
    } catch (error) {
        console.error('[Linter] ✗ Failed to load JavaScript linter:', error);
    }

    // TypeScript/TSX
    try {
        const { TypeScriptLinter } = await import('./linters/typescriptLinter');
        linterRegistry.register(new TypeScriptLinter());
        console.log('[Linter] ✓ TypeScript linter loaded');
    } catch (error) {
        console.error('[Linter] ✗ Failed to load TypeScript linter:', error);
    }

    // Python
    try {
        const { PythonLinter } = await import('./linters/pythonLinter');
        linterRegistry.register(new PythonLinter());
        console.log('[Linter] ✓ Python linter loaded');
    } catch (error) {
        console.error('[Linter] ✗ Failed to load Python linter:', error);
    }

    // JSON
    try {
        const { JsonLinter } = await import('./linters/simpleLinters');
        linterRegistry.register(new JsonLinter());
        console.log('[Linter] ✓ JSON linter loaded');
    } catch (error) {
        console.error('[Linter] ✗ Failed to load JSON linter:', error);
    }

    // CSS
    try {
        const { CssLinter } = await import('./linters/simpleLinters');
        linterRegistry.register(new CssLinter());
        console.log('[Linter] ✓ CSS linter loaded');
    } catch (error) {
        console.error('[Linter] ✗ Failed to load CSS linter:', error);
    }

    // HTML
    try {
        const { HtmlLinter } = await import('./linters/simpleLinters');
        linterRegistry.register(new HtmlLinter());
        console.log('[Linter] ✓ HTML linter loaded');
    } catch (error) {
        console.error('[Linter] ✗ Failed to load HTML linter:', error);
    }

    // 未来可以添加更多语言:
    // - C/C++ (使用 clang-tidy)
    // - Go (使用 golint)
    // - Rust (使用 clippy)
    // - Java (使用 checkstyle)
    // - PHP (使用 phpcs)
    // 等等...

    console.log('[Linter] All linters initialized');
}