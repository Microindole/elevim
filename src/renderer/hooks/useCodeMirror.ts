// src/renderer/hooks/useCodeMirror.ts

import { useEffect, useRef, useState } from 'react';
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { oneDark } from '@codemirror/theme-one-dark';
import { search, searchKeymap } from '@codemirror/search';
import { defaultKeymap } from '@codemirror/commands';
import { getLanguage } from '../../main/lib/language-map';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { linter, lintGutter, Diagnostic } from '@codemirror/lint';

const simpleLinter = (view: EditorView): readonly Diagnostic[] => {
    const diagnostics: Diagnostic[] = [];
    // 这是一个非常简单的示例：查找 'console.log' 并标记为信息
    try {
        const docText = view.state.doc.toString();
        const lines = docText.split('\n');
        let from = 0;
        lines.forEach((line, i) => {
            let col = 0;
            while (col < line.length) {
                const match = line.substring(col).match(/console\.log/);
                if (!match || typeof match.index === 'undefined') break; // 没找到或 index 为 undefined

                const matchStart = col + match.index;
                const matchEnd = matchStart + match[0].length;

                diagnostics.push({
                    from: from + matchStart,
                    to: from + matchEnd,
                    severity: "info", // 可以是 "info", "warning", "error"
                    message: "示例 Lint: 找到 console.log",
                    // 可选：添加修复建议
                    // actions: [{
                    //     name: "移除",
                    //     apply(view, from, to) { view.dispatch({changes: {from, to}}) }
                    // }]
                });
                col = matchEnd; // 从匹配结束后继续查找
            }
            from += line.length + 1; // 加上换行符长度
        });
    } catch (e) {
        console.error("Linter error:", e); // 添加错误处理
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
                    ...customKeymap,       // 自定义快捷键
                    ...searchKeymap,       // 搜索功能的快捷键 (Ctrl-F, F3, etc.)
                    ...defaultKeymap,      // CodeMirror 的默认快捷键 (缩进、撤销等)
                    ...completionKeymap,    // 补全快捷键
                    ...closeBracketsKeymap, // 括号快捷键
                ]),
                fontThemeCompartment.of(EditorView.theme({
                    '.cm-content, .cm-gutters': { fontSize: `15px` }
                })),
                updateListener,
                autocompletion(), // 自动补全
                closeBrackets(),  // 括号自动闭合
                linter(simpleLinter), // 示例 linter
                lintGutter(),         // 在行号旁边显示标记
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