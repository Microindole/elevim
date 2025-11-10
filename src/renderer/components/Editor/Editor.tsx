// src/renderer/components/Editor/Editor.tsx
import React, { useEffect, useState } from 'react';
import { useCodeMirror, updateEditorFontSize, jumpToLine as cmJumpToLine, updateKeymap } from '../../hooks/useCodeMirror';
import './Editor.css';
import {Keymap} from "../../../shared/types";

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
    initialFontSize: number;
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
                                   onJumpComplete,
                                   initialFontSize
                               }: EditorProps) {
    const [fontSize, setFontSize] = useState(initialFontSize);
    const [keymap, setKeymap] = useState<Keymap | null>(null);

    // 延迟加载 keymap
    useEffect(() => {
        window.electronAPI.settings.getSettings().then(settings => { // MODIFIED
            setKeymap(settings.keymap);
        });
    }, []);

    const { editorRef, view } = useCodeMirror({
        content,
        filename,
        onDocChange,
        onSave,
        onCursorChange,
        initialKeymap: keymap
    });

    useEffect(() => {
        if (view && content !== view.state.doc.toString()) {
            programmaticChangeRef.current = true;

            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: content }
            });
        }
    }, [content, view, programmaticChangeRef]); // 将 ref 加入依赖数组

    useEffect(() => {
        setFontSize(initialFontSize);
    }, [initialFontSize]);

    useEffect(() => {
        updateEditorFontSize(view, fontSize);
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

    useEffect(() => {
        const handleSettingsChange = (event: Event) => {
            const { key, value } = (event as CustomEvent).detail;

            if (key === 'fontSize') {
                setFontSize(value);
            }
            if (key === 'keymap') {
                setKeymap(value);
                updateKeymap(view, value, onSave);
            }
        };

        window.addEventListener('settings-changed', handleSettingsChange);
        return () => {
            window.removeEventListener('settings-changed', handleSettingsChange);
        };
    }, [view, onSave]);

    return <div id="editor" ref={editorRef}></div>;
}