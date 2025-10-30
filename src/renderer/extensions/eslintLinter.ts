// src/renderer/extensions/eslintLinter.ts
import { EditorView } from "@codemirror/view";
import { linter, lintGutter, Diagnostic, LintSource } from "@codemirror/lint";
import * as eslint from 'eslint-linter-browserify';

const Linter = (eslint as any).Linter;
const linterInstance = new Linter();

// --- 尝试获取并缓存 ESLint 配置 ---
// 注意：这个简化版本直接使用了硬编码配置。
// 理想情况下，应该从主进程获取 .eslintrc.js 的内容。
const eslintConfig: any = {
    parser: "@typescript-eslint/parser", // 需要确保这个解析器能在浏览器工作，可能有限制
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: { jsx: true }
    },
    env: { browser: true, es2021: true },
    rules: {
        // --- 与 .eslintrc.js 同步的基础规则 ---
        // 你应该把 .eslintrc.js 中定义的核心 JS 规则复制到这里
        // 插件规则 (如 @typescript-eslint/...) 可能无法直接在此处生效
        'semi': ['warn', 'always'],
        'no-unused-vars': 'warn', // 注意：TS 插件的规则在这里可能不工作
        'no-console': 'off',
        'no-debugger': 'error',
        'eqeqeq': 'warn',
        // 'react/jsx-uses-vars': 'error', // React 插件规则可能不工作
    },
};
// ------------------------------------

const esLintSource: LintSource = (view: EditorView): Promise<readonly Diagnostic[]> => {
    return new Promise((resolve) => {
        const code = view.state.doc.toString();
        // 获取当前文件名，以便 ESLint 更好地工作 (虽然在此配置下作用有限)
        // 你可能需要通过 props 或 context 将文件名传递到这里
        const filename = "file.tsx"; // 暂时硬编码

        try {
            const messages = linterInstance.verify(code, eslintConfig, {
                filename: filename
            });

            const diagnostics: Diagnostic[] = messages
                .map((msg: any) => {
                    // 确保行列号有效
                    const line = msg.line - 1 >= 0 ? view.state.doc.line(msg.line) : null;
                    if (!line) return null; // 行号无效则跳过

                    // 计算起始位置
                    const from = line.from + (msg.column - 1 >= 0 ? msg.column - 1 : 0);

                    // 计算结束位置 (如果 ESLint 提供)
                    let to = from + 1; // 默认标记一个字符
                    if (msg.endLine !== undefined && msg.endColumn !== undefined) {
                        const endLine = msg.endLine - 1 >= 0 ? view.state.doc.line(msg.endLine) : null;
                        if (endLine) {
                            const endCol = msg.endColumn - 1 >= 0 ? msg.endColumn - 1 : 0;
                            const calculatedTo = endLine.from + endCol;
                            // 确保 to 不小于 from
                            if (calculatedTo >= from) {
                                to = calculatedTo;
                            } else {
                                console.warn("ESLint reported end position before start position:", msg);
                                // 回退到标记单个字符或起始位置
                                to = from + 1;
                            }
                        }
                    } else if (msg.node && msg.node.range) {
                        // 尝试使用 AST 节点的范围 (如果可用且 verify 返回了)
                        const nodeStart = msg.node.range[0];
                        const nodeEnd = msg.node.range[1];
                        if (nodeEnd > nodeStart && nodeStart >= line.from && nodeEnd <= line.to) { // 简单校验范围
                            to = nodeStart + (nodeEnd - nodeStart);
                            // 再次确保 to >= from
                            if (to < from) to = from + 1;
                        }
                    }
                    // 再次确保 to 不会超出文档范围
                    if (to > view.state.doc.length) {
                        to = view.state.doc.length;
                    }
                    if (from > view.state.doc.length) {
                        console.warn("ESLint reported start position beyond document length:", msg);
                        return null;
                    }


                    return {
                        from: from,
                        to: to,
                        severity: msg.severity === 1 ? "warning" : "error",
                        message: msg.message,
                        source: `ESLint (${msg.ruleId || 'general'})`,
                    };
                })
                .filter((d): d is Diagnostic => d !== null); // 过滤掉 null

            resolve(diagnostics);

        } catch (e) {
            console.error("ESLint verification error:", e);
            resolve([]);
        }
    });
};

// 导出 CodeMirror 扩展
export function eslintLinter() {
    return [
        linter(esLintSource, { delay: 750 }), // 增加延迟
        lintGutter() // 显示行号旁边的标记
    ];
}