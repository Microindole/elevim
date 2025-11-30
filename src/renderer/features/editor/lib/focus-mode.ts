// src/renderer/features/editor/lib/focus-mode.ts
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

// 定义高亮行的样式标记 (仅仅是添加一个 class)
const activeLineDeco = Decoration.line({ class: "cm-focus-active-line" });

export const focusModePlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.getDeco(view);
    }

    update(update: ViewUpdate) {
        // 只有当选区变化或文档变化时才更新装饰器
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
            this.decorations = this.getDeco(update.view);
        }
    }

    getDeco(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const { state } = view;
        const { from, to } = state.selection.main; // 获取主光标选区

        // 获取光标所在行的起始和结束位置
        // 注意：如果要支持多光标，这里需要遍历 state.selection.ranges
        const lineStart = state.doc.lineAt(from);
        const lineEnd = state.doc.lineAt(to);

        // 遍历当前可视区域的所有行
        for (const { from: visibleFrom, to: visibleTo } of view.visibleRanges) {
            for (let pos = visibleFrom; pos <= visibleTo;) {
                const line = state.doc.lineAt(pos);

                // 如果这一行在光标选区范围内（或者是光标所在的行）
                if (line.number >= lineStart.number && line.number <= lineEnd.number) {
                    builder.add(line.from, line.from, activeLineDeco);
                }

                pos = line.to + 1;
            }
        }
        return builder.finish();
    }
}, {
    decorations: v => v.decorations
});