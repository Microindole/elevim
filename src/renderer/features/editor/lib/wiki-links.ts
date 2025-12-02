// src/renderer/features/editor/lib/wiki-links.ts
import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    MatchDecorator,
    WidgetType,
    hoverTooltip
} from "@codemirror/view";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

// =========================================================
// 1. 定义 WikiLink Widget (渲染别名的 UI 组件)
// =========================================================
class WikiLinkWidget extends WidgetType {
    constructor(readonly filename: string, readonly alias: string) {
        super();
    }

    toDOM() {
        const span = document.createElement("span");
        span.className = "cm-wiki-link-widget";
        span.textContent = this.alias;
        span.dataset.filename = this.filename;
        return span;
    }

    ignoreEvent() { return false; }
}

// =========================================================
// 2. 装饰器逻辑 (支持别名 + 光标自动展开)
// =========================================================
const WIKI_LINK_REGEX = /\[\[([^|\]\n]+)(\|([^\]\n]+))?\]\]/g;

const wikiLinkDecorator = new MatchDecorator({
    regexp: WIKI_LINK_REGEX,
    decorate: (add, from, to, match, view) => {
        const filename = match[1];
        const alias = match[3] || filename;
        const { from: selFrom, to: selTo } = view.state.selection.main;

        if (selTo >= from && selFrom <= to) {
            add(from, to, Decoration.mark({ class: "cm-wiki-link-source" }));
        } else {
            add(from, to, Decoration.replace({
                widget: new WikiLinkWidget(filename, alias),
            }));
        }
    }
});

export const wikiLinkPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = wikiLinkDecorator.createDeco(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
            this.decorations = wikiLinkDecorator.createDeco(update.view);
        }
    }
}, {
    decorations: v => v.decorations,
    eventHandlers: {
        mousedown: (e, view) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains("cm-wiki-link-widget")) {
                e.preventDefault();
                const filename = target.dataset.filename;
                if (filename) {
                    window.dispatchEvent(new CustomEvent('wiki-link-click', {
                        detail: { filename }
                    }));
                }
            }
        }
    }
});

// =========================================================
// 3. 自动补全逻辑 (修复双括号问题)
// =========================================================
export function createWikiLinkCompletion(projectPath: string | null) {
    return async (context: CompletionContext): Promise<CompletionResult | null> => {
        const word = context.matchBefore(/\[\[[\w\s\.-]*$/);
        if (!word) return null;
        if (!projectPath) return null;

        try {
            // @ts-ignore
            const result = await window.electronAPI.file.readDirectoryFlat(projectPath);
            if (!result || !result.children) return null;

            const options = result.children
                .filter((item: any) => !item.isDir)
                .map((item: any) => {
                    const label = item.name.replace(/\.[^/.]+$/, "");
                    return {
                        label: label,
                        detail: item.name,
                        // [修复] 这里去掉了 + "]]"，因为编辑器会自动补全闭合括号
                        apply: label,
                        type: "file"
                    };
                });

            return {
                from: word.from + 2,
                options
            };
        } catch (e) {
            console.error(e);
            return null;
        }
    };
}

// =========================================================
// 4. 悬停预览插件 (包含类型修复)
// =========================================================
export function createWikiLinkHover(projectPath: string | null) {
    return hoverTooltip(async (view, pos, side) => {
        if (!projectPath) return null;

        const { from, to, text } = view.state.doc.lineAt(pos);
        const relativePos = pos - from;

        const matches = Array.from(text.matchAll(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g));
        const match = matches.find(m => {
            const start = m.index!;
            const end = start + m[0].length;
            return relativePos >= start && relativePos <= end;
        });

        if (!match) return null;
        const filename = match[1];

        // 预先获取数据
        let contentHtml = "Loading...";
        let isError = false;

        try {
            // @ts-ignore
            const dirData = await window.electronAPI.file.readDirectoryFlat(projectPath);
            const targetFile = dirData.children.find((f: any) =>
                f.name === filename || f.name === `${filename}.md`
            );

            if (targetFile) {
                const fileContent = await window.electronAPI.file.readFileContent(targetFile.path);
                if (fileContent) {
                    const summary = fileContent.slice(0, 500) + (fileContent.length > 500 ? "\n\n..." : "");
                    contentHtml = md.render(summary);
                } else {
                    contentHtml = "(Empty file)";
                }
            } else {
                contentHtml = `File not created: ${filename}`;
                isError = true;
            }
        } catch (e) {
            contentHtml = "Error loading preview";
            isError = true;
        }

        return {
            pos: from + match.index!,
            end: from + match.index! + match[0].length,
            above: true,
            create: () => {
                const dom = document.createElement("div");
                dom.className = "wiki-hover-tooltip";
                dom.style.cssText = "padding: 8px; max-width: 400px; max-height: 300px; overflow: auto; font-size: 13px;";
                if (isError) {
                    dom.textContent = contentHtml;
                    dom.style.color = "#ff6b6b";
                } else {
                    dom.innerHTML = contentHtml;
                }
                return { dom };
            }
        };
    });
}