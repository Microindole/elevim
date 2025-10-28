// src/renderer/components/Editor/Editor.tsx
import React, { useEffect, useState } from 'react';
import { useCodeMirror, updateEditorFontSize } from '../../hooks/useCodeMirror';
import './Editor.css';

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 40;

interface EditorProps {
    content: string;
    onDocChange: (doc: string) => void;
    onSave: () => void;
    // --- 核心修复 #4: 在 props 接口中添加 ref 类型 ---
    programmaticChangeRef: React.MutableRefObject<boolean>;
}

export default function Editor({ content, onDocChange, onSave, programmaticChangeRef }: EditorProps) {
    const { editorRef, view } = useCodeMirror({ content, onDocChange, onSave });
    const [fontSize, setFontSize] = useState(15);

    useEffect(() => {
        if (view && content !== view.state.doc.toString()) {
            // --- 核心修复 #5: 在 dispatch 之前，设置标志位 ---
            programmaticChangeRef.current = true;

            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: content }
            });
        }
    }, [content, view, programmaticChangeRef]); // 将 ref 加入依赖数组

    // 加载和更新字体大小的 Effect (保持不变)
    useEffect(() => {
        window.electronAPI.getSetting('fontSize').then(savedFontSize => {
            if (savedFontSize) {
                setFontSize(savedFontSize);
            }
        });
    }, []);

    useEffect(() => {
        updateEditorFontSize(view, fontSize);
        window.electronAPI.setSetting('fontSize', fontSize);
    }, [fontSize, view]);

    // 滚轮缩放事件 (保持不变)
    useEffect(() => {
        const editorDom = editorRef.current;
        if (!editorDom) return;

        const handleWheel = (event: WheelEvent) => {
            if (event.ctrlKey) {
                event.preventDefault();
                setFontSize(currentSize => {
                    if (event.deltaY < 0) {
                        return Math.min(MAX_FONT_SIZE, currentSize + 1);
                    } else {
                        return Math.max(MIN_FONT_SIZE, currentSize - 1);
                    }
                });
            }
        };

        editorDom.addEventListener('wheel', handleWheel);
        return () => editorDom.removeEventListener('wheel', handleWheel);
    }, [editorRef]);

    return <div id="editor" ref={editorRef}></div>;
}