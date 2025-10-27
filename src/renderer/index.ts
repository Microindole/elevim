// src/renderer/index.ts

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { oneDark } from '@codemirror/theme-one-dark';
import type { IElectronAPI } from '../shared/types';

let view: EditorView;
const defaultTitle = "Elevim Editor";
let isDirty = false;
let currentFileName: string | "Untitled" = "Untitled";
let updateListener: any = null;

/**
 * 统一更新窗口标题的函数
 */
function updateTitle() {
    const titleEl = document.getElementById('title');
    const titleText = currentFileName ? currentFileName : "Untitled";
    const dirtyMarker = isDirty ? "*" : "";

    // 更新原生标题栏 (可选，但保留有好处，比如在任务栏悬停时显示)
    window.electronAPI.setTitle(`${dirtyMarker}${titleText} - ${defaultTitle}`);

    // 更新我们自定义的标题栏
    if (titleEl) {
        titleEl.innerText = `${dirtyMarker}${titleText} - ${defaultTitle}`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const editorContainer = document.getElementById("editor");
    if (editorContainer) {
        updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged && !isDirty) {
                isDirty = true;
                updateTitle();
            }
        });

        const state = EditorState.create({
            doc: `// Welcome to Elevim!\n// Use CmdOrCtrl+O to open a file.`,
            extensions: [
                basicSetup,
                oneDark,
                updateListener
            ],
        });

        view = new EditorView({ state, parent: editorContainer });
        updateTitle();
    }

    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    minimizeBtn?.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
    });

    maximizeBtn?.addEventListener('click', () => {
        window.electronAPI.maximizeWindow();
    });

    closeBtn?.addEventListener('click', () => {
        window.electronAPI.closeWindow();
    });

    document.getElementById('new-file-item')?.addEventListener('click', () => {
        window.electronAPI.triggerNewFile();
    });

    document.getElementById('open-file-item')?.addEventListener('click', () => {
        window.electronAPI.showOpenDialog();
    });

    document.getElementById('save-item')?.addEventListener('click', () => {
        window.electronAPI.triggerSaveFile();
    });

    document.getElementById('save-as-item')?.addEventListener('click', () => {
        window.electronAPI.triggerSaveAsFile();
    });

    document.getElementById('quit-item')?.addEventListener('click', () => {
        window.electronAPI.closeWindow(); // 直接复用关闭窗口的 API
    });
});

// 辅助函数，用于获取标准的扩展配置
function getExtensions() {
    return [
        basicSetup,
        oneDark,
        updateListener
    ];
}

// onFileOpen, onTriggerSave, onNewFile 的逻辑完全保持不变
window.electronAPI.onFileOpen((data: { content: string; filePath: string }) => {
    if (view) {
        const newState = EditorState.create({
            doc: data.content,
            extensions: getExtensions(),
        });
        view.setState(newState);

        currentFileName = data.filePath.split(/[\\/]/).pop() ?? "Untitled";
        isDirty = false;
        updateTitle();
    }
});

window.electronAPI.onTriggerSave(async () => {
    if (view) {
        const content = view.state.doc.toString();
        const savedPath = await window.electronAPI.saveFile(content);
        if (savedPath) {
            currentFileName = savedPath.split(/[\\/]/).pop() ?? "Untitled";
            isDirty = false;
            updateTitle();
        }
    }
});

window.electronAPI.onNewFile(() => {
    if (view) {
        const newState = EditorState.create({
            doc: "",
            extensions: getExtensions(),
        });
        view.setState(newState);

        currentFileName = "Untitled";
        isDirty = false;
        updateTitle();
    }
});