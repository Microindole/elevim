// src/main/ipc-handlers/state.ts
import { App, BrowserWindow } from 'electron';
import * as pty from 'node-pty';

/**
 * 定义一个所有 IPC 处理器共享的状态对象。
 * 这将由根 ipc-handlers.ts 传入。
 */
export interface IpcHandlerSharedState {
    getFolder: () => string | null;
    setFolder: (path: string | null) => void;
    getFile: () => string | null;
    setFile: (path: string | null) => void;
    getPty: () => pty.IPty | null;
    setPty: (pty: pty.IPty | null) => void;
    getShell: () => string;
    getApp: () => App;
    getMainWindow: () => BrowserWindow;
}

// 定义每个模块注册函数的类型
export type IpcHandlerRegistrar = (
    ipcMain: Electron.IpcMain,
    state: IpcHandlerSharedState
) => void;