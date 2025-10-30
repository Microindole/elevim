// src/main/services/linters/typescriptLinter.ts
import * as ts from 'typescript';
import { ILinter, LintDiagnostic } from '../linterService';

/**
 * TypeScript Linter (使用 TypeScript 编译器 API)
 */
export class TypeScriptLinter implements ILinter {
    name = 'TypeScript';
    supportedExtensions = ['ts', 'tsx'];

    async lint(code: string, filename: string): Promise<LintDiagnostic[]> {
        if (!code.trim()) return [];

        try {
            // TypeScript 编译选项
            const compilerOptions: ts.CompilerOptions = {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.ESNext,
                jsx: filename.endsWith('.tsx') ? ts.JsxEmit.React : undefined,
                strict: false, // 不要太严格，避免过多错误
                noEmit: true,
                skipLibCheck: true,
                moduleResolution: ts.ModuleResolutionKind.NodeJs,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
            };

            // 创建虚拟文件
            const sourceFile = ts.createSourceFile(
                filename,
                code,
                ts.ScriptTarget.ES2020,
                true
            );

            // 创建编译器程序
            const host: ts.CompilerHost = {
                getSourceFile: (fileName) => {
                    if (fileName === filename) return sourceFile;
                    return undefined;
                },
                writeFile: () => {},
                getCurrentDirectory: () => '',
                getDirectories: () => [],
                fileExists: () => true,
                readFile: () => '',
                getCanonicalFileName: (fileName) => fileName,
                useCaseSensitiveFileNames: () => true,
                getNewLine: () => '\n',
                getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
            };

            const program = ts.createProgram([filename], compilerOptions, host);
            const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);

            // 转换为统一格式
            return diagnostics
                .filter(d => d.file) // 只保留有文件信息的诊断
                .map(diagnostic => {
                    const { line, character } = diagnostic.file!.getLineAndCharacterOfPosition(
                        diagnostic.start!
                    );

                    let endLine = line;
                    let endColumn = character;

                    if (diagnostic.length) {
                        const end = diagnostic.file!.getLineAndCharacterOfPosition(
                            diagnostic.start! + diagnostic.length
                        );
                        endLine = end.line;
                        endColumn = end.character;
                    }

                    return {
                        line: line + 1, // TypeScript 是 0-based，我们转换为 1-based
                        column: character + 1,
                        endLine: endLine + 1,
                        endColumn: endColumn + 1,
                        severity: this.getSeverity(diagnostic.category),
                        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
                        ruleId: `TS${diagnostic.code}`,
                        source: 'typescript',
                    };
                });
        } catch (error) {
            console.error('[TypeScript Linter] Error:', error);
            return [];
        }
    }

    private getSeverity(category: ts.DiagnosticCategory): 'error' | 'warning' | 'info' {
        switch (category) {
            case ts.DiagnosticCategory.Error:
                return 'error';
            case ts.DiagnosticCategory.Warning:
                return 'warning';
            case ts.DiagnosticCategory.Suggestion:
            case ts.DiagnosticCategory.Message:
                return 'info';
            default:
                return 'warning';
        }
    }
}