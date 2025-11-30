// src/renderer/features/editor/lib/wiki-links.ts
import {
    Decoration,
    DecorationSet,
    EditorView,
    ViewPlugin,
    ViewUpdate,
    MatchDecorator
} from "@codemirror/view";
import {
    CompletionContext,
    CompletionResult
} from "@codemirror/autocomplete";

// ----------------------
// 1. 自动补全逻辑
// ----------------------
export function createWikiLinkCompletion(projectPath: string | null) {
    return async (context: CompletionContext): Promise<CompletionResult | null> => {
        // 匹配光标前的 [[ 以及其后的任意字符（直到行尾或特定字符）
        const word = context.matchBefore(/\[\[[\w\s\.-]*$/);
        if (!word) return null;
        if (!projectPath) return null;

        try {
            // 通过 IPC 读取项目下的所有文件 (扁平化列表)
            // 注意：这里利用了之前实现的 readDirectoryFlat
            const result = await window.electronAPI.file.readDirectoryFlat(projectPath);

            if (!result || !result.children) return null;

            const options = result.children
                .filter((item: any) => !item.isDir) // 只建议文件，不建议文件夹
                .map((item: any) => {
                    // 去掉扩展名用于显示 (例如 "doc.md" -> "doc")
                    const label = item.name.replace(/\.[^/.]+$/, "");
                    return {
                        label: label,
                        detail: item.name, // 在详情里显示完整文件名
                        apply: label + "]]", // 补全时自动闭合 ]]
                        type: "file"
                    };
                });

            return {
                from: word.from + 2, // 从 [[ 之后开始补全
                options,
                // filter: false // 如果你想完全自己控制过滤逻辑，可以设为 false。这里交给 CodeMirror 默认模糊匹配即可。
            };
        } catch (e) {
            console.error("Wiki link completion error:", e);
            return null;
        }
    };
}

// ----------------------
// 2. 装饰器逻辑 (样式 + 点击检测)
// ----------------------

// 使用正则表达式匹配 [[...]]
const wikiLinkMatcher = new MatchDecorator({
    regexp: /\[\[([\w\s\.-]+)\]\]/g,
    decoration: (match) => {
        const filename = match[1];
        // 使用 Mark 装饰器：它只改变样式，不改变底层文本结构，编辑时光标可以进入
        return Decoration.mark({
            class: "cm-wiki-link", // CSS 类名
            attributes: { "data-filename": filename } // 存入文件名以便点击时读取
        });
    }
});

export const wikiLinkPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = wikiLinkMatcher.createDeco(view);
    }

    update(update: ViewUpdate) {
        this.decorations = wikiLinkMatcher.updateDeco(update, this.decorations);
    }
}, {
    decorations: v => v.decorations,

    eventHandlers: {
        // 监听鼠标按下事件
        mousedown: (e, view) => {
            const target = e.target as HTMLElement;
            // 检查点击目标是否是 wiki-link
            if (target.matches(".cm-wiki-link") || target.closest(".cm-wiki-link")) {
                const linkNode = target.matches(".cm-wiki-link") ? target : target.closest(".cm-wiki-link") as HTMLElement;
                const filename = linkNode?.dataset.filename;

                // 如果按下了 Ctrl (或 Command)，或者是直接点击（取决于你的偏好，这里默认直接点击跳转）
                // 也可以加上 if (e.ctrlKey || e.metaKey) 来强制要求按键
                if (filename) {
                    e.preventDefault(); // 阻止默认的光标放置行为
                    console.log(`[WikiLink] Clicked: ${filename}`);

                    // 发送自定义事件，由 AppController 接收并处理打开逻辑
                    window.dispatchEvent(new CustomEvent('wiki-link-click', {
                        detail: { filename }
                    }));
                }
            }
        }
    }
});