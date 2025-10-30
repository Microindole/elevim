// src/main/services/eslintService.ts
import { Linter } from 'eslint';

// 类型定义
export interface LintDiagnostic {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    severity: 'warning' | 'error';
    message: string;
    ruleId: string | null;
}

// 使用 Linter 而不是 ESLint (更轻量,不需要文件系统)
let linter: Linter | null = null;

/**
 * 初始化 Linter
 */
export function initializeESLint() {
    try {
        linter = new Linter();
        console.log('[ESLint] Linter initialized successfully');
        return true;
    } catch (error) {
        console.error('[ESLint] Failed to initialize linter:', error);
        return false;
    }
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
}

/**
 * 判断是否应该 lint 该文件
 */
function shouldLint(filename: string): boolean {
    const ext = getFileExtension(filename);
    return ['js', 'jsx', 'mjs', 'cjs'].includes(ext);
}

/**
 * 获取针对文件类型的配置
 */
function getConfigForFile(filename: string) {
    const ext = getFileExtension(filename);

    // 基础配置
    const baseConfig = {
        env: {
            browser: true,
            es2021: true,
            node: true,
        },
        parserOptions: {
            ecmaVersion: 2021,
            sourceType: 'module' as const,
        },
        rules: {
            'semi': ['warn', 'always'],
            'no-unused-vars': 'warn',
            'no-console': 'off',
            'no-debugger': 'error',
            'eqeqeq': ['warn', 'always'],
            'no-undef': 'error',
            'no-const-assign': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-empty': 'warn',
            'no-unreachable': 'warn',
            'valid-typeof': 'error',
            'no-redeclare': 'error',
            'curly': ['warn', 'all'],
            'no-var': 'warn',
            'prefer-const': 'warn',
        },
        globals: {
            console: 'readonly',
            window: 'readonly',
            document: 'readonly',
            navigator: 'readonly',
            alert: 'readonly',
            confirm: 'readonly',
            prompt: 'readonly',
            localStorage: 'readonly',
            sessionStorage: 'readonly',
            fetch: 'readonly',
            setTimeout: 'readonly',
            setInterval: 'readonly',
            clearTimeout: 'readonly',
            clearInterval: 'readonly',
            process: 'readonly',
            __dirname: 'readonly',
            __filename: 'readonly',
            module: 'readonly',
            require: 'readonly',
            exports: 'readonly',
            global: 'readonly',
            Buffer: 'readonly',
        },
    };

    // JSX 文件的额外配置
    if (ext === 'jsx' || ext === 'tsx') {
        return {
            ...baseConfig,
            parserOptions: {
                ...baseConfig.parserOptions,
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...baseConfig.globals,
                React: 'readonly',
                JSX: 'readonly',
                Record: 'readonly',
                Partial: 'readonly',
                Required: 'readonly',
                Pick: 'readonly',
                Omit: 'readonly',
                Exclude: 'readonly',
                Extract: 'readonly',
                NonNullable: 'readonly',
                ReturnType: 'readonly',
                InstanceType: 'readonly',
                Promise: 'readonly',
                Array: 'readonly',
                Map: 'readonly',
                Set: 'readonly',
                WeakMap: 'readonly',
                WeakSet: 'readonly',
            },
        };
    }

    return baseConfig;
}

/**
 * 对代码进行 lint 检查
 */
export function lintCode(
    code: string,
    filename: string
): LintDiagnostic[] {
    // 初始化检查
    if (!linter) {
        console.warn('[ESLint] Linter not initialized, initializing now...');
        const success = initializeESLint();
        if (!success || !linter) {
            console.error('[ESLint] Failed to initialize linter');
            return [];
        }
    }

    // 文件类型检查
    if (!shouldLint(filename)) {
        return [];
    }

    // 空代码检查
    if (!code || !code.trim()) {
        return [];
    }

    try {
        const config = getConfigForFile(filename);

        console.log(`[ESLint] Linting ${filename} (${code.length} chars)`);

        // 执行 lint
        const messages = linter.verify(code, config, {
            filename: filename,
        });

        console.log(`[ESLint] Found ${messages.length} issues`);

        // 转换格式
        const diagnostics: LintDiagnostic[] = messages.map(msg => ({
            line: msg.line,
            column: msg.column,
            endLine: msg.endLine,
            endColumn: msg.endColumn,
            severity: msg.severity === 2 ? 'error' : 'warning',
            message: msg.message,
            ruleId: msg.ruleId,
        }));

        return diagnostics;

    } catch (error) {
        console.error('[ESLint] Lint error:', error);
        return [];
    }
}

/**
 * 销毁 Linter 实例
 */
export function destroyESLint() {
    linter = null;
    console.log('[ESLint] Linter destroyed');
}