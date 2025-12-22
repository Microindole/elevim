// src/renderer/features/editor/components/Editor/Editor.tsx
import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { URI } from 'vscode-uri';

import Breadcrumbs from '../Breadcrumbs/Breadcrumbs';
import { getMonacoLanguage, defineMonacoTheme, mapLspSeverity } from '../../lib/monaco-utils';
import { EditorColors, ZenModeConfig } from "../../../../../shared/types";
import './Editor.css';

interface EditorProps {
    fileId: string;
    content: string;
    filename: string;
    filePath: string | null;
    onDocChange: (doc: string, fileId: string) => void;
    onSave: () => void;
    programmaticChangeRef: React.MutableRefObject<boolean>;
    onCursorChange: (line: number, col: number) => void;
    jumpToLine: { path: string | null, line: number } | null;
    onJumpComplete: () => void;
    initialFontSize: number;
    projectPath: string | null;
    onOpenFile: (filePath: string) => void;
    themeColors: EditorColors | null;
    zenModeConfig: ZenModeConfig | null;
}

export default function Editor(props: EditorProps) {
    const {
        fileId, content, filename, filePath,
        onDocChange, onSave, onCursorChange,
        jumpToLine, onJumpComplete,
        initialFontSize, themeColors, zenModeConfig,
        projectPath
    } = props;

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const containerRef = useRef<HTMLDivElement>(null); // 新增：用于控制 Zen 模式 CSS 类
    const [version, setVersion] = useState(0);

    const languageId = getMonacoLanguage(filename);
    const fileUri = filePath ? URI.file(filePath).toString() : '';

    const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

        // 1. LSP 初始化
        if (languageId && languageId !== 'plaintext') {
            window.electronAPI.lsp.start(languageId);
            setTimeout(() => {
                window.electronAPI.lsp.send(languageId, {
                    jsonrpc: '2.0',
                    method: 'textDocument/didOpen',
                    params: {
                        textDocument: {
                            uri: fileUri,
                            languageId: languageId,
                            version: 0,
                            text: editor.getValue()
                        }
                    }
                });
            }, 500);
        }

        // 2. 快捷键
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            onSave();
            if (languageId && filePath) {
                window.electronAPI.lsp.send(languageId, {
                    method: 'textDocument/didSave',
                    params: { textDocument: { uri: fileUri } }
                });
            }
        });

        // 3. F12 跳转定义
        editor.addCommand(monaco.KeyCode.F12, async () => {
            if (!filePath || !languageId) return;
            const position = editor.getPosition();
            if (!position) return;

            const result = await window.electronAPI.lsp.request(languageId, {
                method: 'textDocument/definition',
                params: {
                    textDocument: { uri: fileUri },
                    position: { line: position.lineNumber - 1, character: position.column - 1 }
                }
            });

            if (result) {
                const location = Array.isArray(result) ? result[0] : result;
                if (!location) return;
                const targetUri = location.uri || location.targetUri;
                const targetRange = location.range || location.targetSelectionRange;
                if (targetUri && targetRange) {
                    const targetPath = URI.parse(targetUri).fsPath;
                    const targetLine = targetRange.start.line + 1;
                    window.dispatchEvent(new CustomEvent('open-file-request', {
                        detail: { path: targetPath, line: targetLine }
                    }));
                }
            }
        });

        // 4. 光标监听
        editor.onDidChangeCursorPosition((e) => {
            onCursorChange(e.position.lineNumber, e.position.column);
        });
    };

    // LSP 诊断
    useEffect(() => {
        const unsubscribe = window.electronAPI.lsp.onNotification((lang, method, params) => {
            if (lang !== languageId) return;
            if (method === 'textDocument/publishDiagnostics') {
                if (params.uri === fileUri && editorRef.current && monacoRef.current) {
                    const model = editorRef.current.getModel();
                    if (!model) return;
                    const markers = params.diagnostics.map((d: any) => ({
                        severity: mapLspSeverity(d.severity),
                        message: d.message,
                        startLineNumber: d.range.start.line + 1,
                        startColumn: d.range.start.character + 1,
                        endLineNumber: d.range.end.line + 1,
                        endColumn: d.range.end.character + 1,
                        source: d.source
                    }));
                    monacoRef.current.editor.setModelMarkers(model, languageId, markers);
                }
            }
        });
        return () => { if (unsubscribe) unsubscribe(); };
    }, [languageId, fileUri]);

    const handleEditorChange = (value: string | undefined) => {
        const newValue = value || '';
        onDocChange(newValue, fileId);
        if (languageId && filePath) {
            const newVersion = version + 1;
            setVersion(newVersion);
            window.electronAPI.lsp.send(languageId, {
                jsonrpc: '2.0',
                method: 'textDocument/didChange',
                params: {
                    textDocument: { uri: fileUri, version: newVersion },
                    contentChanges: [{ text: newValue }]
                }
            });
        }
    };

    // 字体更新
    useEffect(() => {
        editorRef.current?.updateOptions({ fontSize: initialFontSize });
    }, [initialFontSize]);

    // 主题更新
    useEffect(() => {
        if (themeColors) {
            const themeName = `elevim-theme-${fileId}`;
            defineMonacoTheme(themeName, themeColors);
            monacoRef.current?.editor.setTheme(themeName);
        }
    }, [themeColors, fileId]);

    // ✅ Zen Mode 修复与增强
    useEffect(() => {
        if (editorRef.current && zenModeConfig) {
            editorRef.current.updateOptions({
                lineNumbers: zenModeConfig.hideLineNumbers ? 'off' : 'on',
                minimap: { enabled: !zenModeConfig.hideLineNumbers },
                folding: !zenModeConfig.hideLineNumbers,
                // Zen Mode 增加内边距
                padding: zenModeConfig.centerLayout ? { top: 40, bottom: 40 } : { top: 12, bottom: 12 }
            });

            // 切换 CSS 类以实现 Focus Mode (聚光灯效果)
            if (containerRef.current) {
                if (zenModeConfig.focusMode) {
                    containerRef.current.classList.add('monaco-zen-focus-mode');
                } else {
                    containerRef.current.classList.remove('monaco-zen-focus-mode');
                }
            }
        }
    }, [zenModeConfig]);

    useEffect(() => {
        if (editorRef.current && jumpToLine && jumpToLine.path === filePath) {
            editorRef.current.revealLineInCenter(jumpToLine.line);
            editorRef.current.setPosition({ lineNumber: jumpToLine.line, column: 1 });
            editorRef.current.focus();
            onJumpComplete();
        }
    }, [jumpToLine, filePath, onJumpComplete]);

    return (
        // ✅ 绑定 ref 到这个 wrapper div
        <div ref={containerRef} className="editor-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <Breadcrumbs
                filePath={filePath}
                projectPath={projectPath}
                symbols={[]}
                onItemClick={() => {}}
                onFileSelect={props.onOpenFile}
            />

            <div style={{ flex: 1, position: 'relative' }}>
                <MonacoEditor
                    height="100%"
                    width="100%"
                    language={languageId}
                    value={content}
                    theme="vs-dark"
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    path={filePath || undefined}
                    options={{
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                        fontLigatures: true,
                        fontSize: initialFontSize,
                        lineHeight: 1.6,

                        // ✅ 修复：开启原生缩进参考线
                        guides: {
                            indentation: true,
                            bracketPairs: true
                        },

                        // ✅ 修复：开启行高亮 (gutter 表示只高亮行号栏，all 表示高亮整行)
                        renderLineHighlight: 'all',

                        // ✅ 修复：开启 Ctrl + 滚轮缩放
                        mouseWheelZoom: true,

                        minimap: { enabled: true },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        padding: { top: 12, bottom: 12 },
                        cursorBlinking: 'smooth',
                        smoothScrolling: true,
                        contextmenu: true,
                    }}
                />
            </div>
        </div>
    );
}