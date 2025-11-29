// src/renderer/features/editor/lib/theme-generator.ts
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { EditorColors } from "../../../../shared/types";

export function createThemeExtension(colors: EditorColors): Extension {
    // 定义一个统一的高亮背景色，确保两边一致
    // 使用透明度较低的白色，这样在不同背景色主题下都通用且柔和
    const activeLineBg = "rgba(255, 255, 255, 0.06)";

    const baseTheme = EditorView.theme({
        "&": {
            color: colors.foreground,
            backgroundColor: colors.background,
        },
        ".cm-content": {
            caretColor: colors.caret,
        },
        ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: colors.caret,
        },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
            backgroundColor: colors.selection,
        },

        // --- [修复 1 & 2] 行号栏样式重构 ---
        ".cm-gutters": {
            backgroundColor: colors.gutterBackground,
            color: colors.gutterForeground,
            // [关键] 移除右边框，解决“双层线”太乱的问题
            borderRight: "none",
            minWidth: "60px", // 保持宽度稳定
            textAlign: "right",
            paddingRight: "16px", // 增加内边距，让数字离代码远一点，自然形成视觉分割
            boxSizing: "border-box"
        },
        ".cm-lineNumbers .cm-gutterElement": {
            paddingRight: "4px",
            minWidth: "30px"
        },

        // --- [修复 1] 连通高亮背景 ---
        // 内容区的当前行
        ".cm-activeLine": {
            backgroundColor: activeLineBg,
            borderTopLeftRadius: "0",
            borderBottomLeftRadius: "0"
        },
        // 行号区的当前行
        ".cm-activeLineGutter": {
            backgroundColor: activeLineBg, // 颜色必须完全一致
            color: colors.foreground,
            fontWeight: "bold",
            borderTopRightRadius: "0",
            borderBottomRightRadius: "0"
        },

        ".cm-matchingBracket": {
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            color: "inherit",
            borderBottom: "1px solid " + colors.caret
        }
    }, { dark: true });

    const highlightStyle = HighlightStyle.define([
        { tag: t.keyword, color: colors.keyword, fontWeight: "bold" },
        { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: colors.variable },
        { tag: [t.function(t.variableName), t.labelName], color: colors.function },
        { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: colors.number },
        { tag: [t.definition(t.name), t.separator], color: colors.variable },
        { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: colors.class },
        { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: colors.keyword },
        { tag: [t.meta, t.comment], color: colors.comment, fontStyle: "italic" },
        { tag: t.strong, fontWeight: "bold" },
        { tag: t.emphasis, fontStyle: "italic" },
        { tag: t.strikethrough, textDecoration: "line-through" },
        { tag: t.link, color: colors.attribute, textDecoration: "underline" },
        { tag: [t.atom, t.bool, t.special(t.variableName)], color: colors.number },
        { tag: [t.processingInstruction, t.string, t.inserted], color: colors.string },
        { tag: t.invalid, color: "#ff0000" },
        { tag: [t.tagName], color: colors.tag },
        { tag: [t.attributeName], color: colors.attribute },
    ]);

    return [baseTheme, syntaxHighlighting(highlightStyle)];
}