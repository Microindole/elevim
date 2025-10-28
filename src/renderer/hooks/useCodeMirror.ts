// src/renderer/hooks/useCodeMirror.ts

import { useEffect, useRef, useState } from 'react';
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { oneDark } from '@codemirror/theme-one-dark';

interface UseCodeMirrorProps {
    // 重命名 initialDoc -> content
    content: string;
    onDocChange: (doc: string) => void;
    onSave: () => void;
}

const fontThemeCompartment = new Compartment();

export function useCodeMirror(props: UseCodeMirrorProps) {
    // 解构时也使用新名字
    const { content, onDocChange, onSave } = props;
    const editorRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onDocChange(update.state.doc.toString());
            }
        });

        const saveKeyBinding = keymap.of([{
            key: "Mod-s",
            run: () => { onSave(); return true; }
        }]);

        const startState = EditorState.create({
            // 这里使用 content 作为初始文档
            doc: content,
            extensions: [
                basicSetup,
                oneDark,
                updateListener,
                saveKeyBinding,
                fontThemeCompartment.of(EditorView.theme({
                    '.cm-content, .cm-gutters': { fontSize: `15px` }
                }))
            ],
        });

        const newView = new EditorView({
            state: startState,
            parent: editorRef.current,
        });

        setView(newView);

        return () => {
            newView.destroy();
            setView(null);
        };
        // 关键：依赖数组中【没有】content。
        // 这确保了编辑器实例只被创建一次。
    }, [editorRef, onDocChange, onSave]);

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