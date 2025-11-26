// src/renderer/lib/lsp-hover.ts
import { hoverTooltip } from "@codemirror/view";
import { URI } from 'vscode-uri';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

export function createLspHover(filePath: string, languageId: string) {
    const uri = URI.file(filePath).toString();

    return hoverTooltip(async (view, pos, side) => {
        // [修复] 正确获取行对象
        const lineObj = view.state.doc.lineAt(pos);

        // 计算列号和行号
        const character = pos - lineObj.from;
        const lineNumber = lineObj.number - 1;

        try {
            const result = await window.electronAPI.lsp.request(languageId, {
                method: 'textDocument/hover',
                params: {
                    textDocument: { uri },
                    position: { line: lineNumber, character }
                }
            });

            if (!result || !result.contents) return null;

            let contentStr = "";
            if (typeof result.contents === 'string') {
                contentStr = result.contents;
            } else if (result.contents.kind === 'markdown') {
                contentStr = result.contents.value;
            } else if (Array.isArray(result.contents)) {
                contentStr = result.contents.map((c: any) => (typeof c === 'string' ? c : c.value)).join('\n\n');
            }

            if (!contentStr.trim()) return null;

            return {
                pos,
                create(view) {
                    const dom = document.createElement("div");
                    dom.className = "lsp-hover-content";
                    dom.innerHTML = md.render(contentStr);
                    // 添加样式防止内容溢出
                    dom.style.cssText = "padding: 8px; max-width: 400px; font-size: 13px; line-height: 1.4; overflow-wrap: break-word;";
                    return { dom };
                }
            };
        } catch (e) {
            console.error("Hover error:", e);
            return null;
        }
    });
}