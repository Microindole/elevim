// src/renderer/hooks/useCodeMirror.ts
import {useEffect, useRef, useState} from 'react';
import {EditorState, Compartment, Extension} from "@codemirror/state";
import {
    EditorView,
    keymap,
    lineNumbers,
    highlightActiveLineGutter,
    highlightSpecialChars,
    drawSelection,
    dropCursor,
    rectangularSelection,
    crosshairCursor,
    highlightActiveLine,
    KeyBinding
} from "@codemirror/view";
import {
    defaultHighlightStyle,
    syntaxHighlighting,
    indentOnInput,
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentUnit
} from "@codemirror/language";
import {createThemeExtension} from '../lib/theme-generator';
import {search, searchKeymap} from '@codemirror/search';
import {defaultKeymap, history, historyKeymap} from '@codemirror/commands';
import {getLanguage, getLanguageId} from '../lib/language-map';
import {
    autocompletion,
    completionKeymap,
    closeBrackets,
    closeBracketsKeymap,
    completeAnyWord
} from '@codemirror/autocomplete';
import {linter, lintGutter} from '@codemirror/lint';
import {indentationMarkers} from '@replit/codemirror-indentation-markers';
import { createLspPlugin, notifyLspDidSave } from '../lib/lsp-plugin'; // [修改] 引入 notifyLspDidSave
import { createLspHover } from '../lib/lsp-hover'; // [新增] 引入 Hover
import { URI } from 'vscode-uri'; // [新增] 引入 URI

import {EditorColors, Keymap} from '../../shared/types';
import {createLspCompletionSource} from "../lib/lsp-completion";

interface UseCodeMirrorProps {
    content: string;
    filename: string;
    filePath: string | null;
    projectPath: string | null;
    onDocChange: (doc: string) => void;
    onSave: () => void;
    onCursorChange: (line: number, col: number) => void;
    initialKeymap: Keymap | null;
    onUpdate?: (view: EditorView) => void;
    themeColors: EditorColors | null;
}

const themeCompartment = new Compartment();
const fontThemeCompartment = new Compartment();
const languageCompartment = new Compartment();
const keymapCompartment = new Compartment();

// 自定义缩进线的样式主题
const indentationMarkersTheme = EditorView.baseTheme({
    ".cm-indent-markers .cm-indent-marker": {
        borderLeft: "1px solid rgba(255, 255, 255, 0.15)",
    },
    ".cm-indent-markers .cm-indent-marker-active": {
        borderLeft: "1px solid rgba(255, 255, 255, 0.35)",
    },
});

function createKeymapExtension(keymapConfig: Keymap, onSave: () => void): Extension {
    const saveBinding: KeyBinding[] = [];

    if (keymapConfig['editor.save']) {
        saveBinding.push({
            key: keymapConfig['editor.save'],
            run: () => {
                onSave();
                return true;
            }
        });
    }

    return keymap.of([
        ...saveBinding,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
    ]);
}

export function useCodeMirror(props: UseCodeMirrorProps) {
    const {
        content, filename,
        filePath, projectPath,onDocChange,
        onSave, onCursorChange, initialKeymap,
        onUpdate, themeColors
    } = props;
    const editorRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);

    const onUpdateRef = useRef(onUpdate);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    // [修改] 使用 vscode-uri 生成标准 URI
    const docUri = (filePath) ? URI.file(filePath).toString() : '';

    useEffect(() => {
        if (!editorRef.current || !initialKeymap) return;

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onDocChange(update.state.doc.toString());
            }
            if (update.selectionSet) {
                const pos = update.state.selection.main.head;
                const line = update.state.doc.lineAt(pos);
                onCursorChange(line.number, (pos - line.from) + 1);
            }
            if ((update.docChanged || update.selectionSet || update.viewportChanged) && onUpdateRef.current) {
                onUpdateRef.current(update.view);
            }
        });

        const initialLanguage = getLanguage(filename);

        const initialTheme = themeColors
            ? createThemeExtension(themeColors)
            : [];

        // [修改] 动态判断 LSP
        const languageId = getLanguageId(filename);
        const lspExtensions = [];

        // 默认为基础补全 (防止没有 LSP 时完全没提示)
        let completionConfig = autocompletion({
            override: [completeAnyWord]
        });

        if (languageId && filePath) {
            // 1. 核心插件
            lspExtensions.push(createLspPlugin(filePath, projectPath, languageId));
            // 2. 悬停提示
            lspExtensions.push(createLspHover(filePath, languageId));
            // 3. [修复] 自动补全：同时支持 LSP 和 单词补全
            completionConfig = autocompletion({
                override: [
                    // 优先尝试 LSP
                    createLspCompletionSource(docUri, languageId),
                    // 如果 LSP 没结果，回退到单词补全
                    completeAnyWord
                ]
            });
        }

        // [新增] F12 跳转定义的快捷键逻辑
        const definitionKeymap = keymap.of([{
            key: "F12",
            run: (view: EditorView) => {
                if (!languageId || !filePath) return false;
                const pos = view.state.selection.main.head;
                const lineObj = view.state.doc.lineAt(pos);

                // 发送 Definition 请求
                window.electronAPI.lsp.request(languageId, {
                    method: 'textDocument/definition',
                    params: {
                        textDocument: { uri: docUri },
                        position: { line: lineObj.number - 1, character: pos - lineObj.from }
                    }
                }).then((result: any) => {
                    if (!result) return;
                    // 兼容 Location | Location[] | LocationLink[]
                    const location = Array.isArray(result) ? result[0] : result;
                    if (!location) return;

                    let targetUri = location.uri || location.targetUri;
                    let targetRange = location.range || location.targetSelectionRange;

                    if (!targetUri || !targetRange) return;

                    // 将 file:///c%3A/foo.ts 转回文件路径
                    const targetPath = URI.parse(targetUri).fsPath;
                    const targetLine = targetRange.start.line + 1;

                    console.log(`[LSP] Go to Definition: ${targetPath}:${targetLine}`);

                    // 触发全局事件，由 App.tsx 监听并处理打开文件
                    window.dispatchEvent(new CustomEvent('open-file-request', {
                        detail: { path: targetPath, line: targetLine }
                    }));
                });
                return true;
            }
        }]);

        // [修改] 增强的保存逻辑：通知 LSP
        const handleSaveWithLsp = () => {
            onSave(); // 原始保存 (写入磁盘)
            if (filePath && languageId) {
                notifyLspDidSave(filePath, languageId); // 通知 LSP 重新编译/检查
            }
        };

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
            syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
            bracketMatching(),
            closeBrackets(),
            completionConfig, // 使用配置好的补全
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            search({top: true}),
            themeCompartment.of(initialTheme),
            updateListener,
            fontThemeCompartment.of(EditorView.theme({
                '&': {
                    lineHeight: '1.8',
                    fontFamily: "'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace"
                },
                '.cm-content, .cm-gutters': {
                    fontSize: `15px`,
                    fontFamily: "'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace"
                },
                '.cm-line': {
                    lineHeight: '1.8',
                    padding: '0'
                }
            })),
            lintGutter(),
            languageCompartment.of(initialLanguage ? [initialLanguage] : []),
            indentUnit.of("    "),
            indentationMarkers({
                highlightActiveBlock: true,
                thickness: 1,
            }),
            indentationMarkersTheme,
            // 注册基础快捷键 + F12 跳转
            keymapCompartment.of(createKeymapExtension(initialKeymap, handleSaveWithLsp)),
            definitionKeymap,
            // 加载 LSP 扩展 (同步, 诊断, Hover)
            ...lspExtensions,
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
        if (onUpdateRef.current) {
            onUpdateRef.current(newView);
        }
        onCursorChange(1, 1);

        return () => {
            newView.destroy();
            setView(null);
        };
    }, [initialKeymap, filePath, projectPath, filename]);

    useEffect(() => {
        if (view) {
            const newLanguage = getLanguage(filename);
            view.dispatch({
                effects: languageCompartment.reconfigure(newLanguage ? [newLanguage] : [])
            });
        }
    }, [filename, view]);

    useEffect(() => {
        if (view && themeColors) {
            view.dispatch({
                effects: themeCompartment.reconfigure(createThemeExtension(themeColors))
            });
        }
    }, [themeColors, view]);

    return {editorRef, view};
}

export function updateEditorFontSize(view: EditorView | null, fontSize: number) {
    if (view) {
        view.dispatch({
            effects: fontThemeCompartment.reconfigure(
                EditorView.theme({
                    '&': {
                        lineHeight: '1.8',
                        fontFamily: "'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace"
                    },
                    '.cm-content, .cm-gutters': {
                        fontSize: `${fontSize}px`,
                        fontFamily: "'Consolas', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace"
                    },
                    '.cm-line': {
                        lineHeight: '1.8',
                        padding: '0'
                    }
                })
            )
        });
    }
}

export function jumpToLine(view: EditorView | null, line: number) {
    if (!view || line <= 0) return;

    try {
        const targetLine = Math.min(line, view.state.doc.lines);
        const linePos = view.state.doc.line(targetLine).from;

        view.dispatch({
            selection: {anchor: linePos, head: linePos},
            effects: EditorView.scrollIntoView(linePos, {y: "center"})
        });

        view.focus();

    } catch (e) {
        console.error(`[jumpToLine] 无法跳转到行 ${line}:`, e);
    }
}

export function updateKeymap(view: EditorView | null, keymap: Keymap, onSave: () => void) {
    if (view) {
        view.dispatch({
            effects: keymapCompartment.reconfigure(
                createKeymapExtension(keymap, onSave)
            )
        });
    }
}