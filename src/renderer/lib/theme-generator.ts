// src/renderer/lib/theme-generator.ts
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { EditorColors } from "../../shared/types";

export function createThemeExtension(colors: EditorColors): Extension {
    // 1. 编辑器基础样式 (UI 部分)
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
        ".cm-gutters": {
            backgroundColor: colors.gutterBackground,
            color: colors.gutterForeground,
            borderRight: "1px solid " + colors.lineHighlight,
        },
        ".cm-activeLineGutter": {
            backgroundColor: colors.lineHighlight,
        },
        ".cm-activeLine": {
            backgroundColor: colors.lineHighlight,
        },
        // 可以在这里添加更多 UI 细节定制
    }, { dark: true }); // 默认为暗色模式

    // 2. 语法高亮样式 (代码部分)
    const highlightStyle = HighlightStyle.define([
        { tag: t.keyword, color: colors.keyword },
        { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: colors.variable },
        { tag: [t.function(t.variableName), t.labelName], color: colors.function },
        { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: colors.number },
        { tag: [t.definition(t.name), t.separator], color: colors.variable },
        { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: colors.class },
        { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: colors.keyword },
        { tag: [t.meta, t.comment], color: colors.comment },
        { tag: t.strong, fontWeight: "bold" },
        { tag: t.emphasis, fontStyle: "italic" },
        { tag: t.strikethrough, textDecoration: "line-through" },
        { tag: t.link, color: colors.attribute, textDecoration: "underline" },
        { tag: [t.atom, t.bool, t.special(t.variableName)], color: colors.keyword },
        { tag: [t.processingInstruction, t.string, t.inserted], color: colors.string },
        { tag: t.invalid, color: "#ff0000" },
        // HTML/XML/CSS
        { tag: [t.tagName], color: colors.tag },
        { tag: [t.attributeName], color: colors.attribute },
    ]);

    return [
        baseTheme,
        syntaxHighlighting(highlightStyle)
    ];
}