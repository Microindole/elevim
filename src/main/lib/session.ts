// src/main/lib/session.ts
import Store from 'electron-store';
import { BrowserWindow } from 'electron';

// 定义我们要保存的数据结构
export interface WindowState {
    x?: number;
    y?: number;
    width: number;
    height: number;
    isMaximized: boolean;
}

export interface EditorSession {
    groups: Array<{
        id: string;
        activeFileIndex: number;
        files: Array<string>; // 只保存文件路径
    }>;
    activeGroupId: string;
    sidebarWidth: number;
    sidebarView: any; // 'explorer' | 'git' | ...
    currentFolderPath: string | null;
}

interface StoreSchema {
    windowState: WindowState;
    editorSession: EditorSession;
}

const store = new Store<StoreSchema>({
    name: 'session', // 保存为 session.json
    defaults: {
        windowState: { width: 1200, height: 800, isMaximized: false },
        editorSession: {
            groups: [],
            activeGroupId: '',
            sidebarWidth: 250,
            sidebarView: 'explorer',
            currentFolderPath: null
        }
    }
});

// --- 窗口状态管理 ---
export function saveWindowState(window: BrowserWindow) {
    if (window.isDestroyed()) return;
    const isMaximized = window.isMaximized();
    if (isMaximized) {
        store.set('windowState.isMaximized', true);
    } else {
        const bounds = window.getBounds();
        store.set('windowState', {
            ...bounds,
            isMaximized: false
        });
    }
}

export function getWindowState(): WindowState {
    return store.get('windowState');
}

// --- 编辑器会话管理 ---
export function saveEditorSession(session: EditorSession) {
    store.set('editorSession', session);
}

export function getEditorSession(): EditorSession {
    return store.get('editorSession');
}