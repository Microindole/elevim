// src/renderer/extensions/universalLinter.ts
import { EditorView } from "@codemirror/view";
import { linter, lintGutter, Diagnostic } from "@codemirror/lint";

// 当前文件名
let currentFilename = 'untitled.txt';

/**
 * 设置当前文件名
 */
export function setLinterFilename(filename: string) {
    currentFilename = filename;
    console.log('[Universal Linter] Filename updated:', filename);
}

/**
 * 创建通用多语言 linter 扩展
 * 支持: JavaScript, TypeScript, Python, JSON, CSS, HTML 等
 */
export function universalLinter() {
    const lintSource = async (view: EditorView): Promise<Diagnostic[]> => {
        // 检查 API 是否可用
        if (!window.electronAPI?.eslintLint) {
            console.warn('[Universal Linter] ElectronAPI not available');
            return [];
        }

        const code = view.state.doc.toString();

        // 空代码不检查
        if (!code.trim()) {
            return [];
        }

        try {
            console.log(`[Universal Linter] Requesting lint for: ${currentFilename}`);

            // 调用主进程的多语言 linter 服务
            const result = await window.electronAPI.eslintLint(code, currentFilename);

            if (!result.success) {
                if (result.error) {
                    console.error('[Universal Linter] Lint failed:', result.error);
                }
                return [];
            }

            const diagnostics = result.diagnostics || [];
            console.log(`[Universal Linter] Received ${diagnostics.length} diagnostics`);

            // 转换为 CodeMirror Diagnostic 格式
            const cmDiagnostics: Diagnostic[] = [];

            for (const msg of diagnostics) {
                try {
                    // 验证行号
                    if (msg.line < 1 || msg.line > view.state.doc.lines) {
                        console.warn('[Universal Linter] Invalid line:', msg.line);
                        continue;
                    }

                    const line = view.state.doc.line(msg.line);

                    // 计算起始位置 (column 是 1-based)
                    const col = Math.max(0, (msg.column || 1) - 1);
                    const from = Math.min(line.from + col, view.state.doc.length);

                    // 计算结束位置
                    let to = from + 1;

                    if (msg.endLine && msg.endColumn) {
                        if (msg.endLine >= 1 && msg.endLine <= view.state.doc.lines) {
                            const endLine = view.state.doc.line(msg.endLine);
                            const endCol = Math.max(0, (msg.endColumn || 1) - 1);
                            to = Math.min(endLine.from + endCol, view.state.doc.length);
                        }
                    }

                    // 确保 to > from
                    if (to <= from) {
                        to = Math.min(from + 1, view.state.doc.length);
                    }

                    // 根据来源设置显示名称
                    let source = 'linter';
                    if (msg.source) {
                        source = msg.source;
                        if (msg.ruleId) {
                            source = `${msg.source}: ${msg.ruleId}`;
                        }
                    } else if (msg.ruleId) {
                        source = msg.ruleId;
                    }

                    cmDiagnostics.push({
                        from,
                        to,
                        severity: msg.severity,
                        message: msg.message,
                        source: source,
                    });

                } catch (err) {
                    console.warn('[Universal Linter] Failed to process diagnostic:', msg, err);
                }
            }

            console.log(`[Universal Linter] Converted ${cmDiagnostics.length} diagnostics`);
            return cmDiagnostics;

        } catch (error) {
            console.error('[Universal Linter] Error during linting:', error);
            return [];
        }
    };

    return [
        linter(lintSource, {
            delay: 800, // 800ms 延迟，避免频繁检查
        }),
        lintGutter(), // 在行号旁显示诊断标记
    ];
}