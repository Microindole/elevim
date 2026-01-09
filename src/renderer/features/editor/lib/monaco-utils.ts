import * as monaco from 'monaco-editor';
import { EditorColors } from '../../../../shared/types';

/**
 * 1. 语言 ID 映射
 * 将文件名后缀映射为 Monaco 支持的 Language ID
 */
export function getMonacoLanguage(filename: string): string {
    if (!filename) return 'plaintext';
    const ext = filename.split('.').pop()?.toLowerCase();

    const map: Record<string, string> = {
        'ts': 'typescript', 'tsx': 'typescript',
        'js': 'javascript', 'jsx': 'javascript',
        'py': 'python', 'pyw': 'python',
        'json': 'json',
        'html': 'html', 'htm': 'html',
        'css': 'css', 'scss': 'scss', 'less': 'less',
        'md': 'markdown', 'markdown': 'markdown',
        'rs': 'rust',
        'go': 'go',
        'java': 'java',
        'c': 'c', 'h': 'c',
        'cpp': 'cpp', 'hpp': 'cpp', 'cc': 'cpp',
        'sh': 'shell', 'bash': 'shell',
        'yml': 'yaml', 'yaml': 'yaml',
        'xml': 'xml',
        'sql': 'sql',
        'php': 'php',
        'vue': 'html',
    };

    return map[ext || ''] || 'plaintext';
}

/**
 * 2. 核心：主题转换适配器 (Clean Version)
 * 将 App 通用主题格式 (EditorColors) 转换为 Monaco 主题格式
 * 修复了参考线颜色混乱的问题
 */
export function defineMonacoTheme(themeName: string, theme: EditorColors) {
    // 1. 语法高亮映射 (严格匹配 EditorColors)
    const rules = [
        { token: 'comment', foreground: theme.comment },
        { token: 'keyword', foreground: theme.keyword },
        { token: 'string', foreground: theme.string },
        { token: 'number', foreground: theme.number },
        { token: 'regexp', foreground: theme.string },

        // 变量与标识符
        { token: 'variable', foreground: theme.variable },
        { token: 'identifier', foreground: theme.variable },

        // 函数
        { token: 'function', foreground: theme.function },
        { token: 'entity.name.function', foreground: theme.function },

        // 类与类型
        { token: 'type', foreground: theme.class },
        { token: 'class', foreground: theme.class },
        { token: 'entity.name.type', foreground: theme.class },

        // 标签 (HTML/XML)
        { token: 'tag', foreground: theme.tag },
        { token: 'attribute.name', foreground: theme.attribute },

        // 运算符与标点
        { token: 'delimiter', foreground: theme.foreground },
        { token: 'operator', foreground: theme.keyword },
    ];

    // 过滤掉未定义的颜色
    const activeRules = rules.filter(r => r.foreground) as monaco.editor.ITokenThemeRule[];

    // 2. 基础 UI 颜色映射
    const uiColors: monaco.editor.IStandaloneThemeData['colors'] = {
        'editor.background': theme.background,
        'editor.foreground': theme.foreground,
        'editorCursor.foreground': theme.caret,
        'editor.selectionBackground': theme.selection,
        'editor.lineHighlightBackground': theme.lineHighlight,

        // 行号栏
        'editorLineNumber.foreground': theme.gutterForeground,
        'editorGutter.background': theme.gutterBackground,
        'editorLineNumber.activeForeground': theme.foreground,

        // 关键修复：强制设置缩进参考线颜色为灰色，防止五花八门
        // 使用 gutterForeground (通常是灰色) 并大幅降低透明度
        'editorIndentGuide.background': theme.gutterForeground + '30',
        'editorIndentGuide.activeBackground': theme.gutterForeground + '70',
    };

    // 3. 定义主题
    monaco.editor.defineTheme(themeName, {
        base: 'vs-dark', // 默认基于暗色
        inherit: true,   // 继承默认规则
        rules: activeRules,
        colors: uiColors,
    });
}

/**
 * 3. LSP 严重程度映射
 */
export function mapLspSeverity(severity: number): monaco.MarkerSeverity {
    switch (severity) {
        case 1: return monaco.MarkerSeverity.Error;
        case 2: return monaco.MarkerSeverity.Warning;
        case 3: return monaco.MarkerSeverity.Info;
        case 4: return monaco.MarkerSeverity.Hint;
        default: return monaco.MarkerSeverity.Info;
    }
}