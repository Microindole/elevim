// src/main/services/linters/simpleLinters.ts
import { ILinter, LintDiagnostic } from '../linterService';

/**
 * JSON Linter - 检查 JSON 语法
 */
export class JsonLinter implements ILinter {
    name = 'JSON';
    supportedExtensions = ['json', 'jsonc'];

    async lint(code: string, filename: string): Promise<LintDiagnostic[]> {
        if (!code.trim()) return [];

        try {
            JSON.parse(code);
            return [];
        } catch (error: any) {
            // 解析错误信息
            const message = error.message || 'Invalid JSON';
            const match = message.match(/position (\d+)/);

            let line = 1;
            let column = 1;

            if (match) {
                const position = parseInt(match[1]);
                const lines = code.substring(0, position).split('\n');
                line = lines.length;
                column = lines[lines.length - 1].length + 1;
            }

            return [{
                line,
                column,
                severity: 'error',
                message: message,
                ruleId: 'json-parse-error',
                source: 'json',
            }];
        }
    }
}

/**
 * CSS Linter - 基础 CSS 语法检查
 */
export class CssLinter implements ILinter {
    name = 'CSS (Basic)';
    supportedExtensions = ['css'];

    async lint(code: string, filename: string): Promise<LintDiagnostic[]> {
        if (!code.trim()) return [];

        const diagnostics: LintDiagnostic[] = [];
        const lines = code.split('\n');

        // 简单的括号匹配检查
        let braceCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            for (const char of line) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;

                if (braceCount < 0) {
                    diagnostics.push({
                        line: i + 1,
                        column: line.indexOf('}') + 1,
                        severity: 'error',
                        message: 'Unexpected closing brace',
                        ruleId: 'brace-mismatch',
                        source: 'css',
                    });
                    braceCount = 0;
                }
            }
        }

        if (braceCount !== 0) {
            diagnostics.push({
                line: lines.length,
                column: 1,
                severity: 'error',
                message: 'Unclosed brace',
                ruleId: 'unclosed-brace',
                source: 'css',
            });
        }

        return diagnostics;
    }
}

/**
 * HTML Linter - 基础 HTML 标签匹配检查
 */
export class HtmlLinter implements ILinter {
    name = 'HTML (Basic)';
    supportedExtensions = ['html', 'htm'];

    async lint(code: string, filename: string): Promise<LintDiagnostic[]> {
        if (!code.trim()) return [];

        const diagnostics: LintDiagnostic[] = [];
        const lines = code.split('\n');

        // 自闭合标签
        const selfClosing = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr']);

        // 标签栈
        const tagStack: Array<{ tag: string; line: number; column: number }> = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 匹配开始标签
            const openTags = line.matchAll(/<([a-z][a-z0-9]*)/gi);
            for (const match of openTags) {
                const tag = match[1].toLowerCase();
                if (!selfClosing.has(tag)) {
                    tagStack.push({
                        tag,
                        line: i + 1,
                        column: match.index! + 1,
                    });
                }
            }

            // 匹配结束标签
            const closeTags = line.matchAll(/<\/([a-z][a-z0-9]*)/gi);
            for (const match of closeTags) {
                const tag = match[1].toLowerCase();
                const lastOpen = tagStack.pop();

                if (!lastOpen) {
                    diagnostics.push({
                        line: i + 1,
                        column: match.index! + 1,
                        severity: 'error',
                        message: `Unexpected closing tag </${tag}>`,
                        ruleId: 'unexpected-closing-tag',
                        source: 'html',
                    });
                } else if (lastOpen.tag !== tag) {
                    diagnostics.push({
                        line: i + 1,
                        column: match.index! + 1,
                        severity: 'error',
                        message: `Expected closing tag </${lastOpen.tag}>, but found </${tag}>`,
                        ruleId: 'tag-mismatch',
                        source: 'html',
                    });
                }
            }
        }

        // 检查未闭合的标签
        for (const unclosed of tagStack) {
            diagnostics.push({
                line: unclosed.line,
                column: unclosed.column,
                severity: 'error',
                message: `Unclosed tag <${unclosed.tag}>`,
                ruleId: 'unclosed-tag',
                source: 'html',
            });
        }

        return diagnostics;
    }
}