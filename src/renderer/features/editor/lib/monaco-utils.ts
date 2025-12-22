// src/renderer/features/editor/lib/monaco-utils.ts
import * as monaco from 'monaco-editor';
import { EditorColors } from '../../../../../shared/types';

// 1. 文件名到 Monaco 语言 ID 的映射
export const getMonacoLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript',
        js: 'javascript', jsx: 'javascript',
        py: 'python',
        html: 'html', css: 'css', scss: 'scss', less: 'less',
        json: 'json',
        md: 'markdown',
        rs: 'rust', go: 'go',
        c: 'c', cpp: 'cpp', h: 'cpp',
        java: 'java',
        xml: 'xml', yaml: 'yaml', yml: 'yaml',
        sh: 'shell', bash: 'shell'
    };
    return map[ext || ''] || 'plaintext';
};

// 2. 将 Elevim 的 EditorColors 转换为 Monaco 主题
export const defineMonacoTheme = (name: string, colors: EditorColors) => {
    monaco.editor.defineTheme(name, {
        base: 'vs-dark', // 基于暗色模式
        inherit: true,
        rules: [
            // 这里可以根据 colors.syntax 进一步细化语法高亮规则
            // 简单起见，我们先依靠 Monaco 的默认高亮，仅覆盖基础颜色
            { token: 'comment', foreground: '6272a4' },
            { token: 'keyword', foreground: 'ff79c6' },
        ],
        colors: {
            'editor.background': colors.background,
            'editor.foreground': colors.foreground,
            'editorCursor.foreground': colors.cursor || '#f8f8f2',
            'editor.selectionBackground': colors.selection || '#44475a',
            'editor.lineHighlightBackground': '#44475a50',
            'editorLineNumber.foreground': '#6272a4',
            'editorIndentGuide.background': '#ffffff20',
            'editorIndentGuide.activeBackground': '#ffffff60',
        }
    });
};

// 3. LSP 严重程度转换
export const mapLspSeverity = (severity: number): monaco.MarkerSeverity => {
    switch (severity) {
        case 1: return monaco.MarkerSeverity.Error;
        case 2: return monaco.MarkerSeverity.Warning;
        case 3: return monaco.MarkerSeverity.Info;
        default: return monaco.MarkerSeverity.Hint;
    }
};