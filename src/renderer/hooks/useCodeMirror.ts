// src/renderer/hooks/useCodeMirror.ts

import { useEffect, useRef, useState } from 'react';
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view";
import { defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, indentUnit } from "@codemirror/language";
import { oneDark } from '@codemirror/theme-one-dark';
import { search, searchKeymap } from '@codemirror/search';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { getLanguage } from '../../main/lib/language-map';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { linter, lintGutter, Diagnostic } from '@codemirror/lint';

// 导入缩进对齐线扩展
import { indentationMarkers } from '@replit/codemirror-indentation-markers';

const simpleLinter = (view: EditorView): readonly Diagnostic[] => {
    const diagnostics: Diagnostic[] = [];
    try {
        const docText = view.state.doc.toString();
        const lines = docText.split('\n');
        let from = 0;
        lines.forEach((line, i) => {
            let col = 0;
            while (col < line.length) {
                const match = line.substring(col).match(/console\.log/);
                if (!match || typeof match.index === 'undefined') break;

                const matchStart = col + match.index;
                const matchEnd = matchStart + match[0].length;

                diagnostics.push({
                    from: from + matchStart,
                    to: from + matchEnd,
                    severity: "info",
                    message: "示例 Lint: 找到 console.log",
                });
                col = matchEnd;
            }
            from += line.length + 1;
        });
    } catch (e) {
        console.error("Linter error:", e);
    }
    return diagnostics;
};

interface UseCodeMirrorProps {
    content: string;
    filename: string;
    onDocChange: (doc: string) => void;
    onSave: () => void;
    onCursorChange: (line: number, col: number) => void;
}

const fontThemeCompartment = new Compartment();
const languageCompartment = new Compartment();

// 自定义缩进线的样式主题
const indentationMarkersTheme = EditorView.baseTheme({
    ".cm-indent-markers .cm-indent-marker": {
        borderLeft: "1px solid rgba(255, 255, 255, 0.15)", // 浅色对齐线
    },
    ".cm-indent-markers .cm-indent-marker-active": {
        borderLeft: "1px solid rgba(255, 255, 255, 0.35)", // 高亮当前作用域的对齐线
    },
});

export function useCodeMirror(props: UseCodeMirrorProps) {
    const { content, filename, onDocChange, onSave, onCursorChange } = props;
    const editorRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onDocChange(update.state.doc.toString());
            }
            if (update.selectionSet) {
                const pos = update.state.selection.main.head;
                const line = update.state.doc.lineAt(pos);
                onCursorChange(line.number, (pos - line.from) + 1);
            }
        });

        const customKeymap = [
            {
                key: "Mod-s",
                run: () => { onSave(); return true; }
            },
        ];

        const initialLanguage = getLanguage(filename);

        const setup = [
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            search({ top: true }),
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                ...customKeymap,
            ]),
            oneDark,
            updateListener,
            fontThemeCompartment.of(EditorView.theme({
                '.cm-content, .cm-gutters': { fontSize: `15px` }
            })),
            linter(simpleLinter),
            lintGutter(),
            languageCompartment.of(initialLanguage ? [initialLanguage] : []),
            // 添加缩进对齐线扩展
            indentUnit.of("    "), // 设置缩进单位（可选，默认为2个空格）
            indentationMarkers({
                highlightActiveBlock: true, // 高亮当前光标所在的代码块
                thickness: 1, // 线条粗细
            }),
            indentationMarkersTheme, // 应用自定义样式
        ];

        const startState = EditorState.create({
            doc: content,
            extensions: setup
        });

        const newView = new EditorView({
            state: startState,
            parent: editorRef.current,
        });

        setView(newView);
        onCursorChange(1, 1);

        return () => {
            newView.destroy();
            setView(null);
        };
    }, []);

    useEffect(() => {
        if (view) {
            const newLanguage = getLanguage(filename);
            view.dispatch({
                effects: languageCompartment.reconfigure(newLanguage ? [newLanguage] : [])
            });
        }
    }, [filename, view]);

    return { editorRef, view };
}

export function updateEditorFontSize(view: EditorView | null, fontSize: number) {
    if (view) {
        view.dispatch({
            effects: fontThemeCompartment.reconfigure(
                EditorView.theme({
                    '.cm-content, .cm-gutters': { fontSize: `${fontSize}px` }
                })
            )
        });
    }
}