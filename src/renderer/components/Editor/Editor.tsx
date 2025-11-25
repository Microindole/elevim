// src/renderer/components/Editor/Editor.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { useCodeMirror, updateEditorFontSize, jumpToLine as cmJumpToLine, updateKeymap } from '../../hooks/useCodeMirror';
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs';
import { getSymbolPath, BreadcrumbItem } from '../../lib/breadcrumbs-util';
import './Editor.css';
import {EditorColors, Keymap} from "../../../shared/types";

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
    projectPath: string | null;
    onOpenFile: (filePath: string) => void;
    themeColors: EditorColors | null;
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
    initialFontSize,
    projectPath,
    onOpenFile,
    themeColors,
}: EditorProps) {
    const [fontSize, setFontSize] = useState(initialFontSize);
    const [keymap, setKeymap] = useState<Keymap | null>(null);

    const [breadcrumbSymbols, setBreadcrumbSymbols] = useState<BreadcrumbItem[]>([]);

    // 延迟加载 keymap
    useEffect(() => {
        window.electronAPI.settings.getSettings().then(settings => {
            setKeymap(settings.keymap);
        });
    }, []);

    // 使用 useCallback 避免不必要的重渲染传递给 useCodeMirror
    const handleBreadcrumbUpdate = useCallback((view: EditorView) => {
        // 这是一个轻量级操作，因为 getSymbolPath 只是向上遍历父节点
        const symbols = getSymbolPath(view.state);

        // 简单的防抖或比较，防止 state 频繁更新导致 React 渲染
        // 这里简单使用 JSON stringify 比较，实际场景可能需要更高效的方法
        setBreadcrumbSymbols(prev => {
            if (JSON.stringify(prev) === JSON.stringify(symbols)) {
                return prev;
            }
            return symbols;
        });
    }, []);

    const { editorRef, view } = useCodeMirror({
        content,
        filename,
        onDocChange,
        onSave,
        onCursorChange,
        initialKeymap: keymap,
        onUpdate: handleBreadcrumbUpdate,
        themeColors: themeColors,
    });

    useEffect(() => {
        if (view && content !== view.state.doc.toString()) {
            programmaticChangeRef.current = true;

            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: content }
            });
        }
    }, [content, view, programmaticChangeRef]);

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
        if (view && jumpToLine && jumpToLine.path === filePath) {
            cmJumpToLine(view, jumpToLine.line);
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

    // --- 修改：处理点击面包屑跳转 ---
    const handleSymbolClick = (item: BreadcrumbItem) => {
        if (item.startPos !== undefined && view) {
            // 跳转并把目标行滚动到中间
            view.dispatch({
                selection: { anchor: item.startPos, head: item.startPos },
                effects: EditorView.scrollIntoView(item.startPos, { y: "center" })
            });
            view.focus();
        }
    };

    return (
        <div className="editor-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Breadcrumbs
                filePath={filePath}
                projectPath={projectPath}
                symbols={breadcrumbSymbols}
                onItemClick={handleSymbolClick}
                onFileSelect={onOpenFile}
            />
            <div id="editor" ref={editorRef} style={{ flex: 1, overflow: 'hidden' }}></div>
        </div>
    );
}