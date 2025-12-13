// src/renderer-markdown/components/WriterEditor.tsx
import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

interface WriterEditorProps {
    content: string;
    onChange: (val: string) => void;
}

export const WriterEditor: React.FC<WriterEditorProps> = ({ content, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        if (!editorRef.current) return;

        // Writer 模式的特定配置
        const startState = EditorState.create({
            doc: content,
            extensions: [
                history(),
                keymap.of([...defaultKeymap, ...historyKeymap]),
                markdown({ codeLanguages: languages }), // Markdown 语法支持
                syntaxHighlighting(defaultHighlightStyle),

                // --- 写作模式的关键配置 ---
                EditorView.lineWrapping, // 自动换行 (Typora 必备)
                // 我们可以选择隐藏行号，让界面更像文档
                // lineNumbers(),

                // 监听变化
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                }),

                // 自定义样式：让编辑器看起来像一张纸
                EditorView.theme({
                    "&": {
                        height: "100%",
                        fontSize: "16px",
                        fontFamily: "'Merriweather', 'Georgia', serif", // 使用衬线体更像文档
                        backgroundColor: "#ffffff",
                        color: "#333"
                    },
                    ".cm-content": {
                        padding: "20px 0", // 上下留白
                        maxWidth: "800px", // 限制最大宽度，类似阅读模式
                        margin: "0 auto"   // 居中
                    },
                    ".cm-scroller": {
                        fontFamily: "inherit"
                    },
                    "&.cm-focused": {
                        outline: "none" // 去除聚焦时的边框
                    }
                })
            ]
        });

        const view = new EditorView({
            state: startState,
            parent: editorRef.current
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        };
    }, []); // 初始化一次

    // 外部内容更新时同步（例如打开新文件）
    // 注意：这里需要做 diff 检查防止光标跳动，简化版直接重置
    useEffect(() => {
        if (viewRef.current && content !== viewRef.current.state.doc.toString()) {
            viewRef.current.dispatch({
                changes: { from: 0, to: viewRef.current.state.doc.length, insert: content }
            });
        }
    }, [content]); // 当 content 这里的引用变化时触发，实际上需要更精细的控制

    return <div ref={editorRef} style={{ height: '100%', overflow: 'hidden' }} />;
};