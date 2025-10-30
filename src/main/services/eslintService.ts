// src/main/services/eslintService.ts
import { ESLint } from 'eslint';
import path from 'path';
import { app } from 'electron';

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

let eslintInstance: ESLint | null = null;
let projectRoot: string = '';

/**
 * 初始化 ESLint 实例（使用内联配置，不依赖配置文件）
 */
export async function initializeESLint() {
    try {
        projectRoot = app.isPackaged
            ? path.join(process.resourcesPath, '..')
            : path.join(__dirname, '../../..');

        console.log('[ESLint] Project root:', projectRoot);

        // 使用内联配置，完全不依赖配置文件
        eslintInstance = new ESLint({
            cwd: projectRoot,
            overrideConfig: {
                env: {
                    browser: true,
                    es2021: true,
                },
                parserOptions: {
                    ecmaVersion: 'latest',
                    sourceType: 'module',
                    ecmaFeatures: {
                        jsx: true,
                    },
                },
                rules: {
                    // 基础规则
                    'semi': ['warn', 'always'],
                    'no-unused-vars': 'warn',
                    'no-console': 'off',
                    'no-debugger': 'error',
                    'eqeqeq': 'warn',
                    'no-undef': 'error',
                    'no-const-assign': 'error',
                    'no-dupe-keys': 'error',
                    'no-duplicate-case': 'error',
                    'no-empty': 'warn',
                    'no-unreachable': 'warn',
                    'valid-typeof': 'error',
                },
            },
        });

        console.log('[ESLint] Initialized successfully with inline config');
        return true;
    } catch (error) {
        console.error('[ESLint] Failed to initialize:', error);
        return false;
    }
}

/**
 * 对代码进行 lint 检查
 */
export async function lintCode(
    code: string,
    filename: string
): Promise<LintDiagnostic[]> {
    if (!eslintInstance) {
        console.warn('[ESLint] Not initialized, attempting to initialize...');
        const success = await initializeESLint();
        if (!success || !eslintInstance) {
            return [];
        }
    }

    try {
        // 使用 lintText 进行检查
        const results = await eslintInstance.lintText(code, {
            filePath: filename,
        });

        if (results.length === 0) return [];

        const messages = results[0].messages;

        // 转换为我们需要的格式
        const diagnostics = messages.map(msg => ({
            line: msg.line,
            column: msg.column,
            endLine: msg.endLine,
            endColumn: msg.endColumn,
            severity: (msg.severity === 2 ? 'error' : 'warning') as 'warning' | 'error',
            message: msg.message,
            ruleId: msg.ruleId,
        }));

        console.log(`[ESLint] Found ${diagnostics.length} issues in ${filename}`);
        return diagnostics;

    } catch (error) {
        console.error('[ESLint] Lint error:', error);
        return [];
    }
}

/**
 * 销毁 ESLint 实例
 */
export function destroyESLint() {
    eslintInstance = null;
    console.log('[ESLint] Instance destroyed');
}