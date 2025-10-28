// src/renderer/hooks/useCodeMirror.ts

import { useEffect, useRef, useState } from 'react';
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { oneDark } from '@codemirror/theme-one-dark';
import { search, searchKeymap } from '@codemirror/search';
import { defaultKeymap } from '@codemirror/commands';
import { getLanguage } from '../../main/lib/language-map';

interface UseCodeMirrorProps {
    content: string;
    filename: string;
    onDocChange: (doc: string) => void;
    onSave: () => void;
    onCursorChange: (line: number, col: number) => void;
}

const fontThemeCompartment = new Compartment();
const languageCompartment = new Compartment();

export function useCodeMirror(props: UseCodeMirrorProps) {
    // 解构时也使用新名字
    const { content, filename, onDocChange, onSave, onCursorChange } = props;
    const editorRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        const updateListener = EditorView.updateListener.of((update) => {
            // 如果文档内容改变，调用 onDocChange
            if (update.docChanged) {
                onDocChange(update.state.doc.toString());
            }
            // 如果选区 (光标) 改变，计算行列号并调用 onCursorChange
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
            // 你可以在这里添加更多自定义快捷键
        ];

        const initialLanguage = getLanguage(filename);

        const startState = EditorState.create({
            // 这里使用 content 作为初始文档
            doc: content,
            extensions: [
                basicSetup,
                oneDark,
                updateListener,
                search({
                    top: true, // 让搜索框出现在顶部
                }),
                keymap.of([
                    ...customKeymap,       // 我们的自定义快捷键
                    ...searchKeymap,       // 搜索功能的快捷键 (Ctrl-F, F3, etc.)
                    ...defaultKeymap,      // CodeMirror 的默认快捷键 (缩进、撤销等)
                ]),
                fontThemeCompartment.of(EditorView.theme({
                    '.cm-content, .cm-gutters': { fontSize: `15px` }
                })),
                updateListener,
                languageCompartment.of(initialLanguage ? [initialLanguage] : []),
            ],
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
        // 关键：依赖数组中【没有】content。
        // 这确保了编辑器实例只被创建一次。
    }, []);

    useEffect(() => {
        if (view) {
            const newLanguage = getLanguage(filename);
            view.dispatch({
                effects: languageCompartment.reconfigure(newLanguage ? [newLanguage] : [])
            });
        }
    }, [filename, view]); // 当文件名或 view 实例变化时触发

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