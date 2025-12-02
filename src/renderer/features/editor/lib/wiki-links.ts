// src/renderer/features/editor/lib/wiki-links.ts
import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    MatchDecorator,
    WidgetType
} from "@codemirror/view";
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";

// =========================================================
// 1. 定义 WikiLink Widget (渲染别名的 UI 组件)
// =========================================================
class WikiLinkWidget extends WidgetType {
    constructor(readonly filename: string, readonly alias: string) {
        super();
    }

    toDOM() {
        // 创建一个 span 元素来代替原始文本
        const span = document.createElement("span");
        span.className = "cm-wiki-link-widget"; // 使用新的 CSS 类名
        span.textContent = this.alias; // 只显示别名 (如果没有别名，传入的也是文件名)
        span.dataset.filename = this.filename; // 存入文件名用于点击
        return span;
    }

    // 告诉 CodeMirror 忽略此 Widget 内部的事件，让编辑器处理点击
    ignoreEvent() { return false; }
}

// =========================================================
// 2. 装饰器逻辑 (核心：支持别名 + 光标自动展开)
// =========================================================

// 正则：匹配 [[filename]] 或 [[filename|alias]]
// 捕获组 1: filename
// 捕获组 3: alias (可选)
const WIKI_LINK_REGEX = /\[\[([^|\]\n]+)(\|([^\]\n]+))?\]\]/g;

const wikiLinkDecorator = new MatchDecorator({
    regexp: WIKI_LINK_REGEX,
    decorate: (add, from, to, match, view) => {
        const filename = match[1];
        const alias = match[3] || filename; // 有别名用别名，没有用文件名

        // 获取当前光标/选区的位置
        const { from: selFrom, to: selTo } = view.state.selection.main;

        // 【核心逻辑】
        // 如果光标在这个链接范围内 (Overlap)，则不进行 Replace，显示源码。
        // 为了体验更好，我们在两侧加一点 buffer (比如光标紧贴着由括号时也展开)
        if (selTo >= from && selFrom <= to) {
            // 光标在链接上：
            // 我们不仅不替换，还可以加一个高亮样式让源码更好看 (可选)
            add(from, to, Decoration.mark({ class: "cm-wiki-link-source" }));
        } else {
            // 光标不在链接上：
            // 使用 Widget 替换掉整段 [[...]] 文本
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
        // 这里的关键是：当选区(Selection)变化时，也必须重新计算装饰器
        // 这样才能实现“光标移入展开，移出折叠”的效果
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
            this.decorations = wikiLinkDecorator.createDeco(update.view);
        }
    }
}, {
    decorations: v => v.decorations,

    eventHandlers: {
        mousedown: (e, view) => {
            const target = e.target as HTMLElement;
            // 检查点击的是否是我们的 Widget
            if (target.classList.contains("cm-wiki-link-widget")) {
                e.preventDefault();
                const filename = target.dataset.filename;
                if (filename) {
                    console.log(`[WikiLink] Opening: ${filename}`);
                    // 触发自定义事件打开文件
                    window.dispatchEvent(new CustomEvent('wiki-link-click', {
                        detail: { filename }
                    }));
                }
            }
        }
    }
});

// =========================================================
// 3. 自动补全逻辑 (保持原有功能，稍作优化)
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
                        apply: label + "]]",
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