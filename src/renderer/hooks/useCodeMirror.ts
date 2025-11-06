// src/renderer/hooks/useCodeMirror.ts
import { useEffect, useRef, useState } from 'react';
import { EditorState, Compartment, Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, KeyBinding } from "@codemirror/view";
import { defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, indentUnit } from "@codemirror/language";
import { oneDark } from '@codemirror/theme-one-dark';
import { search, searchKeymap } from '@codemirror/search';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { getLanguage } from '../../main/lib/language-map';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { linter, lintGutter, Diagnostic } from '@codemirror/lint';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';

import { Keymap } from '../../shared/types';

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
    initialKeymap: Keymap | null;
}

const fontThemeCompartment = new Compartment();
const languageCompartment = new Compartment();
const keymapCompartment = new Compartment();

// 自定义缩进线的样式主题
const indentationMarkersTheme = EditorView.baseTheme({
    ".cm-indent-markers .cm-indent-marker": {
        borderLeft: "1px solid rgba(255, 255, 255, 0.15)",
    },
    ".cm-indent-markers .cm-indent-marker-active": {
        borderLeft: "1px solid rgba(255, 255, 255, 0.35)",
    },
});

function createKeymapExtension(keymapConfig: Keymap, onSave: () => void): Extension {
    const saveBinding: KeyBinding[] = [];

    // 从 keymap 对象中读取 'editor.save' 的配置
    if (keymapConfig['editor.save']) {
        saveBinding.push({
            key: keymapConfig['editor.save'], // (例如 "Mod+S")
            run: () => { onSave(); return true; }
        });
    }

    // 返回包含所有快捷键的扩展
    return keymap.of([
        ...saveBinding,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
    ]);
}

export function useCodeMirror(props: UseCodeMirrorProps) {
    const { content, filename, onDocChange, onSave, onCursorChange, initialKeymap } = props;
    const editorRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current || !initialKeymap) return;

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
            oneDark,
            updateListener,
            fontThemeCompartment.of(EditorView.theme({
                '&': {
                    lineHeight: '1.8', // 增加行高，让代码更舒适
                    fontFamily: "'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace"
                },
                '.cm-content, .cm-gutters': {
                    fontSize: `15px`,
                    fontFamily: "'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace"
                },
                '.cm-line': {
                    lineHeight: '1.8',
                    padding: '0' // 确保没有额外的内边距
                }
            })),
            linter(simpleLinter),
            lintGutter(),
            languageCompartment.of(initialLanguage ? [initialLanguage] : []),
            indentUnit.of("    "),
            indentationMarkers({
                highlightActiveBlock: true,
                thickness: 1,
            }),
            indentationMarkersTheme,
            keymapCompartment.of(
                createKeymapExtension(initialKeymap, onSave)
            ),
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
    }, [initialKeymap]);

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
                    '&': {
                        lineHeight: '1.8', // 保持行高一致
                        fontFamily: "'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace"
                    },
                    '.cm-content, .cm-gutters': {
                        fontSize: `${fontSize}px`,
                        fontFamily: "'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace"
                    },
                    '.cm-line': {
                        lineHeight: '1.8',
                        padding: '0'
                    }
                })
            )
        });
    }
}

export function jumpToLine(view: EditorView | null, line: number) {
    if (!view || line <= 0) return;

    try {
        const targetLine = Math.min(line, view.state.doc.lines);
        const linePos = view.state.doc.line(targetLine).from;

        view.dispatch({
            selection: { anchor: linePos, head: linePos },
            effects: EditorView.scrollIntoView(linePos, { y: "center" })
        });

        view.focus();

    } catch (e) {
        console.error(`[jumpToLine] 无法跳转到行 ${line}:`, e);
    }
}

export function updateKeymap(view: EditorView | null, keymap: Keymap, onSave: () => void) {
    if (view) {
        view.dispatch({
            effects: keymapCompartment.reconfigure(
                createKeymapExtension(keymap, onSave)
            )
        });
    }
}
