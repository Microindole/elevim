// src/renderer/lib/language-map.ts
import { StreamLanguage } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { go } from '@codemirror/lang-go';
import { rust } from '@codemirror/lang-rust';

// Legacy Modes
import { csharp } from '@codemirror/legacy-modes/mode/clike';
import { xml } from '@codemirror/legacy-modes/mode/xml';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';
import { properties } from '@codemirror/legacy-modes/mode/properties';


/**
 * 根据文件名后缀获取对应的 CodeMirror 语言扩展。
 * @param filename 文件名
 * @returns CodeMirror 的语言扩展，如果找不到则返回 null。
 */
export function getLanguage(filename: string) {
    const extension = (/\.([^.]+)$/.exec(filename) || [])[1];

    if (!extension) {
        return null;
    }
    switch (extension.toLowerCase()) {
        // 现代语言包
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            return javascript({ jsx: true, typescript: true });
        case 'css':
            return css();
        case 'html':
            return html();
        case 'json':
            return json();
        case 'md':
        case 'markdown':
            return markdown();
        case 'py':
            return python();
        case 'java':
            return java();
        case 'c':
        case 'cpp':
        case 'h':
        case 'hpp':
            return cpp();
        case 'go':
            return go();
        case 'rs':
            return rust();

        // Legacy Modes (流式解析器)
        case 'cs':
            return StreamLanguage.define(csharp);
        case 'xml':
            return StreamLanguage.define(xml);
        case 'yml':
        case 'yaml':
            return StreamLanguage.define(yaml);
        case 'properties':
            return StreamLanguage.define(properties);

        default:
            return null;
    }
}