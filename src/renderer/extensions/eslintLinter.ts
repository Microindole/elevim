// src/renderer/extensions/eslintLinter.ts
import { EditorView } from "@codemirror/view";
import { linter, lintGutter, Diagnostic } from "@codemirror/lint";

// 当前文件名,供 linter 使用
let currentFilename = 'untitled.js';

/**
 * 设置当前文件名
 */
export function setLinterFilename(filename: string) {
    currentFilename = filename;
    console.log('[ESLint Linter] Filename set to:', filename);
}

/**
 * 创建 ESLint linter 扩展
 */
export function eslintLinter() {
    const lintSource = async (view: EditorView): Promise<Diagnostic[]> => {
        // 检查 electronAPI 是否可用
        if (!window.electronAPI || !window.electronAPI.eslintLint) {
            console.warn('[ESLint Linter] ElectronAPI not available');
            return [];
        }

        const code = view.state.doc.toString();

        // 如果代码为空,不进行检查
        if (!code.trim()) {
            return [];
        }

        try {
            console.log('[ESLint Linter] Linting:', currentFilename);
            const result = await window.electronAPI.eslintLint(code, currentFilename);

            if (!result.success) {
                if (result.error) {
                    console.error('[ESLint Linter] Error:', result.error);
                }
                return [];
            }

            if (!result.diagnostics || result.diagnostics.length === 0) {
                return [];
            }

            // 转换诊断信息为 CodeMirror 格式
            const diagnostics: Diagnostic[] = result.diagnostics
                .map(msg => {
                    try {
                        // 获取起始行
                        if (msg.line < 1 || msg.line > view.state.doc.lines) {
                            console.warn('[ESLint Linter] Invalid line number:', msg.line);
                            return null;
                        }

                        const line = view.state.doc.line(msg.line);

                        // 计算起始位置 (column 是 1-based)
                        const columnOffset = Math.max(0, (msg.column || 1) - 1);
                        const from = line.from + columnOffset;

                        // 计算结束位置
                        let to = from + 1; // 默认标记一个字符

                        if (msg.endLine && msg.endColumn) {
                            // 如果有结束位置信息
                            if (msg.endLine >= 1 && msg.endLine <= view.state.doc.lines) {
                                const endLine = view.state.doc.line(msg.endLine);
                                const endColumnOffset = Math.max(0, (msg.endColumn || 1) - 1);
                                to = endLine.from + endColumnOffset;

                                // 确保 to >= from
                                if (to <= from) {
                                    to = from + 1;
                                }
                            }
                        }

                        // 确保位置在文档范围内
                        if (from < 0 || from >= view.state.doc.length) {
                            console.warn('[ESLint Linter] Invalid from position:', from);
                            return null;
                        }

                        if (to > view.state.doc.length) {
                            to = view.state.doc.length;
                        }

                        return {
                            from,
                            to,
                            severity: msg.severity,
                            message: msg.message,
                            source: msg.ruleId ? `ESLint (${msg.ruleId})` : 'ESLint',
                        } as Diagnostic;

                    } catch (e) {
                        console.warn('[ESLint Linter] Failed to process diagnostic:', msg, e);
                        return null;
                    }
                })
                .filter((d): d is Diagnostic => d !== null);

            console.log(`[ESLint Linter] Found ${diagnostics.length} issues`);
            return diagnostics;

        } catch (error) {
            console.error('[ESLint Linter] Linting failed:', error);
            return [];
        }
    };

    return [
        linter(lintSource, {
            delay: 1000, // 1秒延迟,避免频繁检查
        }),
        lintGutter() // 在行号旁显示标记
    ];
}