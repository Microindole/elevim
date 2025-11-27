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
import {autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap, completeAnyWord} from '@codemirror/autocomplete';
import {lintGutter} from '@codemirror/lint';
import {indentationMarkers} from '@replit/codemirror-indentation-markers';
import { createLspPlugin, notifyLspDidSave } from '../lib/lsp-plugin';
import { createLspHover } from '../lib/lsp-hover';
import { URI } from 'vscode-uri';

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

// 参考线样式：使用极细的虚线或低透明度实线
const indentationMarkersTheme = EditorView.baseTheme({
    // 默认线条（未激活）
    ".cm-indent-markers .cm-indent-marker": {
        background: "none",
        borderLeft: "2px solid rgba(255, 255, 255, 0.4)",
        width: "1.5px", // 显式设置宽度
        marginRight: "4px" // 可选：给一点右间距，让代码不要紧贴着线
    },

    // 激活的线条（Active）
    ".cm-indent-markers .cm-indent-marker-active": {
        borderLeft: "2px solid rgba(255, 255, 255, 0.9)",
        width: "1.5px",
    },
});

function createKeymapExtension(keymapConfig: Keymap, onSave: () => void): Extension {
    const saveBinding: KeyBinding[] = [];
    if (keymapConfig['editor.save']) {
        saveBinding.push({
            key: keymapConfig['editor.save'],
            run: () => { onSave(); return true; }
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
    useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

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
        const initialTheme = themeColors ? createThemeExtension(themeColors) : [];
        const languageId = getLanguageId(filename);
        const lspExtensions = [];
        let completionConfig = autocompletion({ override: [completeAnyWord] });

        if (languageId && filePath) {
            lspExtensions.push(createLspPlugin(filePath, projectPath, languageId));
            lspExtensions.push(createLspHover(filePath, languageId));
            completionConfig = autocompletion({
                override: [
                    createLspCompletionSource(docUri, languageId),
                    completeAnyWord
                ]
            });
        }

        const definitionKeymap = keymap.of([{
            key: "F12",
            run: (view: EditorView) => {
                if (!languageId || !filePath) return false;
                const pos = view.state.selection.main.head;
                const lineObj = view.state.doc.lineAt(pos);
                window.electronAPI.lsp.request(languageId, {
                    method: 'textDocument/definition',
                    params: {
                        textDocument: { uri: docUri },
                        position: { line: lineObj.number - 1, character: pos - lineObj.from }
                    }
                }).then((result: any) => {
                    if (!result) return;
                    const location = Array.isArray(result) ? result[0] : result;
                    if (!location) return;
                    let targetUri = location.uri || location.targetUri;
                    let targetRange = location.range || location.targetSelectionRange;
                    if (!targetUri || !targetRange) return;
                    const targetPath = URI.parse(targetUri).fsPath;
                    const targetLine = targetRange.start.line + 1;
                    window.dispatchEvent(new CustomEvent('open-file-request', {
                        detail: { path: targetPath, line: targetLine }
                    }));
                });
                return true;
            }
        }]);

        const handleSaveWithLsp = () => {
            onSave();
            if (filePath && languageId) {
                notifyLspDidSave(filePath, languageId);
            }
        };

        // 字体与布局配置
        const fontTheme = EditorView.theme({
            '&': {
                height: '100%',
            },
            '.cm-scroller': {
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace",
                lineHeight: '1.6',
                fontVariantLigatures: 'none',
                scrollbarGutter: 'stable'
            },
            '.cm-content': {
                fontSize: '14px',
                // 给一点内边距，让第一行不贴顶，看起来更舒服
                padding: '8px 0'
            },
            '.cm-gutters': {
                fontSize: '14px',
                fontFamily: 'inherit',
                // 保持行号区域没有额外的垂直边距，与 content 对齐的关键
                // 如果 content 有 padding，这里最好保持一致或通过 CSS 处理，
                // 但 CM6 通常自动处理行对齐。关键是不要给 .cm-line 设 padding。
            }
        });

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
            completionConfig,
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            search({top: true}),
            themeCompartment.of(initialTheme),
            updateListener,
            fontThemeCompartment.of(fontTheme),
            lintGutter(),
            languageCompartment.of(initialLanguage ? [initialLanguage] : []),
            indentUnit.of("    "),
            indentationMarkers({
                highlightActiveBlock: true, // 开启，然后用上面的 CSS 控制样式
                hideFirstIndent: true,      // 隐藏第0级缩进线，彻底解决“双层线”问题！
                thickness: 1.5,
            }),
            indentationMarkersTheme,
            keymapCompartment.of(createKeymapExtension(initialKeymap, handleSaveWithLsp)),
            definitionKeymap,
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
                    '.cm-scroller': {
                        lineHeight: '1.6',
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
                        scrollbarGutter: 'stable'
                    },
                    '.cm-content': {
                        fontSize: `${fontSize}px`,
                        padding: '8px 0'
                    },
                    '.cm-gutters': {
                        fontSize: `${fontSize}px`,
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