// src/index.ts
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { indentOnInput } from "@codemirror/language";
import { vim } from "@replit/codemirror-vim";
import { ipcRenderer } from 'electron';

// 这是一个包含了大部分基础编辑器功能的扩展数组
const myBasicSetup = [
    history(), // 撤销/重做功能
    keymap.of([
        ...defaultKeymap,   // 默认快捷键 (复制、粘贴等)
        ...historyKeymap,   // 撤销/重做快捷键
        ...searchKeymap     // 搜索快捷键
    ]),
    indentOnInput(), // 输入时自动缩进
    EditorView.lineWrapping, // 自动换行
    EditorView.theme({}, {dark: true}) // 使用一个简单的暗色主题
];

let view: EditorView;

const defaultTitle = "Elevim Editor";

window.addEventListener('DOMContentLoaded', () => {
    const startDoc = `// Welcome to Elevim!
// Use CmdOrCtrl+O to open a file.
`;
    const editorContainer = document.getElementById("editor");

    if (editorContainer) {
        const state = EditorState.create({
            doc: startDoc,
            extensions: [
                vim(),
                myBasicSetup,
            ],
        });

        // 将创建的 EditorView 实例赋值给 view 变量
        view = new EditorView({
            state: state,
            parent: editorContainer,
        });
    }

    // 初始化时设置默认标题
    window.electronAPI.setTitle(defaultTitle);
});

// 当文件被打开时
window.electronAPI.onFileOpen((data: { content: string; filePath: string }) => {
    if (view) {
        // 更新编辑器内容
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: data.content },
        });
        // 更新窗口标题
        const fileName = data.filePath.split(/[\\/]/).pop() ?? defaultTitle;
        window.electronAPI.setTitle(fileName);
    }
});

// 当收到保存触发指令时
window.electronAPI.onTriggerSave(async () => {
    if (view) {
        const content = view.state.doc.toString();
        const savedPath = await window.electronAPI.saveFile(content);
        if (savedPath) {
            const fileName = savedPath.split(/[\\/]/).pop() ?? defaultTitle;
            window.electronAPI.setTitle(fileName); // 另存为后也要更新标题
        }
    }
});

window.electronAPI.onTriggerSave(async () => {
    if (view) {
        const content = view.state.doc.toString();
        try {
            const savedPath = await window.electronAPI.saveFile(content);
            if (savedPath) {
                console.log(`File saved successfully to: ${savedPath}`);
            } else {
                console.log('Save operation was canceled by the user.');
            }
        } catch (error) {
            console.error('Error saving file:', error);
        }
    }
});