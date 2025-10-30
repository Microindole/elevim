// src/main/services/linters/javascriptLinter.ts
import { Linter } from 'eslint';
import { ILinter, LintDiagnostic } from '../linterService';

/**
 * JavaScript/JSX Linter (使用 ESLint)
 */
export class JavaScriptLinter implements ILinter {
    name = 'ESLint (JavaScript)';
    supportedExtensions = ['js', 'jsx', 'mjs', 'cjs'];

    private linter: Linter;

    constructor() {
        this.linter = new Linter();
    }

    async lint(code: string, filename: string): Promise<LintDiagnostic[]> {
        if (!code.trim()) return [];

        const config = {
            env: {
                browser: true,
                es2021: true,
                node: true,
            },
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module' as const,
                ecmaFeatures: {
                    jsx: filename.endsWith('.jsx'),
                },
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
                Promise: 'readonly',
                Array: 'readonly',
                Map: 'readonly',
                Set: 'readonly',
                React: 'readonly',
                JSX: 'readonly',
            },
        };

        try {
            const messages = this.linter.verify(code, config, { filename });

            return messages.map(msg => ({
                line: msg.line,
                column: msg.column,
                endLine: msg.endLine,
                endColumn: msg.endColumn,
                severity: msg.severity === 2 ? 'error' : 'warning',
                message: msg.message,
                ruleId: msg.ruleId,
                source: 'eslint',
            }));
        } catch (error) {
            console.error('[JavaScript Linter] Error:', error);
            return [];
        }
    }
}