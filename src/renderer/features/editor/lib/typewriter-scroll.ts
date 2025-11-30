// src/renderer/features/editor/lib/typewriter-scroll.ts
import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

export const typewriterScrollPlugin = ViewPlugin.fromClass(class {
    constructor(private view: EditorView) {}

    update(update: ViewUpdate) {
        // 只有当选区（光标）变化，或者文档内容变化时才触发
        if (update.selectionSet || update.docChanged) {
            this.centerCursor();
        }
    }

    centerCursor() {
        const { view } = this;
        const state = view.state;

        // 1. 获取主光标位置
        const head = state.selection.main.head;

        // 2. 检查光标是否在可视区域内 (防止某些边缘情况报错)
        // 获取光标所在的视觉行信息
        const lineBlock = view.lineBlockAt(head);

        // 3. 计算需要的滚动偏移量
        // 目标：让光标行的顶部位于屏幕中心
        const editorHeight = view.dom.clientHeight;

        // 如果编辑器高度太小（比如刚初始化），不处理
        if (editorHeight < 100) return;

        // 使用 scrollIntoView 的 y: 'center' 选项
        // 这会让 CodeMirror 尝试把目标位置放到中间
        view.dispatch({
            effects: EditorView.scrollIntoView(head, {
                y: "center",
                yMargin: editorHeight / 2 - 50 // 强制巨大的 margin 也能达到类似效果，确保它尽量在中间
            })
        });
    }
});