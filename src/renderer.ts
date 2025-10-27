// src/renderer.ts
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { indentOnInput } from "@codemirror/language";
import { vim } from "@replit/codemirror-vim";

// --- 我们手动重新创建 basicSetup 的核心功能 ---
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
// --- 手动创建结束 ---

window.addEventListener('DOMContentLoaded', () => {
  const startDoc = `// Welcome to Elevim!
// Press 'i' to enter insert mode.
// Press 'Esc' to exit insert mode.
`;
  const editorContainer = document.getElementById("editor");

  if (editorContainer) {
    const state = EditorState.create({
      doc: startDoc,
      extensions: [
        vim(),
        myBasicSetup // 使用我们自己定义的 setup
      ],
    });

    new EditorView({
      state: state,
      parent: editorContainer,
    });
  }
});