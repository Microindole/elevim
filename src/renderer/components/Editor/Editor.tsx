// src/renderer/components/Editor/Editor.tsx
import React, { useEffect, useState } from 'react';
import { useCodeMirror, updateEditorFontSize, jumpToLine as cmJumpToLine } from '../../hooks/useCodeMirror';
import './Editor.css';

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 40;

interface EditorProps {
    content: string;
    filename: string;
    filePath: string | null;
    onDocChange: (doc: string) => void;
    onSave: () => void;
    programmaticChangeRef: React.MutableRefObject<boolean>;
    onCursorChange: (line: number, col: number) => void;
    jumpToLine: { path: string | null, line: number } | null;
    onJumpComplete: () => void;
}

export default function Editor({
   content,
   filename,
   filePath,
   onDocChange,
   onSave,
   programmaticChangeRef,
   onCursorChange,
   jumpToLine,
   onJumpComplete
}: EditorProps) {
    const { editorRef, view } = useCodeMirror({ content, filename, onDocChange, onSave, onCursorChange });
    const [fontSize, setFontSize] = useState(15);

    useEffect(() => {
        if (view && content !== view.state.doc.toString()) {
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

    // 滚轮缩放事件
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

    useEffect(() => {
        // 检查：
        // 1. CodeMirror view 是否已准备好
        // 2. 是否有跳转请求
        // 3. 跳转请求的路径(jumpToLine.path)是否与当前编辑器显示的路径(filePath)匹配
        if (view && jumpToLine && jumpToLine.path === filePath) {

            // 执行跳转！
            cmJumpToLine(view, jumpToLine.line);

            // 通知 App.tsx 跳转已完成，以便重置状态
            onJumpComplete();
        }
    }, [view, jumpToLine, filePath, onJumpComplete]);

    return <div id="editor" ref={editorRef}></div>;
}