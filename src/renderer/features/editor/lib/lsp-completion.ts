// src/renderer/features/editor/lib/lsp-completion.ts
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";

// 将 LSP 的 CompletionItemKind 转换为 CodeMirror 识别的类型字符串
function mapCompletionKind(kind: number): string {
    switch (kind) {
        case 1: return "text";
        case 2: return "method";
        case 3: return "function";
        case 4: return "constructor";
        case 5: return "field";
        case 6: return "variable";
        case 7: return "class";
        case 8: return "interface";
        case 9: return "module";
        case 10: return "property";
        // ... 更多映射可按需添加
        default: return "text";
    }
}

// 核心补全函数 (这个旧函数如果不再使用可以删除或保留作为参考)
export async function lspCompletionSource(context: CompletionContext): Promise<CompletionResult | null> {
    return null;
}

// [修改] 工厂函数现在接受 languageId
export function createLspCompletionSource(documentUri: string, languageId: string) {
    return async (context: CompletionContext): Promise<CompletionResult | null> => {
        // 1. 匹配当前光标前的单词
        let word = context.matchBefore(/\w*/);

        // 检测光标前是否是点号 (Python/JS 的成员访问)
        const isDot = context.matchBefore(/\./);

        // 触发条件：
        // A. 显式触发 (Ctrl+Space)
        // B. 匹配到了单词 (且长度>0)
        // C. 刚刚输入了点号 (.)
        if (!context.explicit && !isDot && (!word || word.from === word.to)) {
            return null;
        }

        // 如果是点号触发，word 可能是 null，我们需要修正 word 对象以避免报错
        if (!word) {
            word = { from: context.pos, to: context.pos, text: "" };
        }

        // CodeMirror 的位置是 offset (0-based index)
        const { state } = context;
        const line = state.doc.lineAt(context.pos);
        const character = context.pos - line.from;

        try {
            // 3. 发送 LSP 请求
            // [关键修改] 这里传入 languageId 作为第一个参数
            const result = await window.electronAPI.lsp.request(languageId, {
                method: 'textDocument/completion',
                params: {
                    textDocument: { uri: documentUri },
                    position: { line: line.number - 1, character: character },
                    // 告诉 Server 这是由触发字符引发的 (可选，有助于优化)
                    context: {
                        triggerKind: isDot ? 2 : 1, // 2 = TriggerCharacter
                        triggerCharacter: isDot ? '.' : undefined
                    }
                }
            });

            if (!result) return null;

            let items: any[] = [];
            if (Array.isArray(result)) {
                items = result;
            } else if (result && Array.isArray(result.items)) {
                items = result.items;
            }

            // 如果没有 items，直接返回 null (让 CodeMirror 去尝试下一个 source，即 completeAnyWord)
            if (items.length === 0) return null;

            const options = items.map((item: any) => ({
                label: item.label,
                type: mapCompletionKind(item.kind),
                detail: item.detail,
                info: item.documentation, // 这里如果是 Markdown 字符串，CodeMirror 会自动显示
                apply: item.insertText || item.label
                // TODO: 支持 item.textEdit 以处理更复杂的插入逻辑
            }));

            return {
                from: word.from,
                options: options
            };

        } catch (e) {
            console.error('LSP Completion Error:', e);
            return null;
        }
    };
}