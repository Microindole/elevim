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
import { eslintLinter, setLinterFilename } from '../extensions/eslintLinter';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';

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
        borderLeft: "1px solid rgba(255, 255, 255, 0.15)",
    },
    ".cm-indent-markers .cm-indent-marker-active": {
        borderLeft: "1px solid rgba(255, 255, 255, 0.35)",
    },
});

export function useCodeMirror(props: UseCodeMirrorProps) {
    const { content, filename, onDocChange, onSave, onCursorChange } = props;
    const editorRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        // 设置当前文件名供 ESLint linter 使用
        setLinterFilename(filename);

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
            // 使用主进程的 ESLint linter
            eslintLinter(),
            languageCompartment.of(initialLanguage ? [initialLanguage] : []),
            indentUnit.of("    "),
            indentationMarkers({
                highlightActiveBlock: true,
                thickness: 1.5,
            }),
            indentationMarkersTheme,
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
            // 更新语言支持
            const newLanguage = getLanguage(filename);
            view.dispatch({
                effects: languageCompartment.reconfigure(newLanguage ? [newLanguage] : [])
            });

            // 更新 ESLint linter 的文件名
            setLinterFilename(filename);
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