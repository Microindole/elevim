// src/main/ipc-handlers.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as pty from 'node-pty';
import * as os from 'os';
import * as gitService from './lib/git-service'; // Git watcher event needs to be registered here
import { registerAllIpcHandlers } from './ipc-handlers/index';
import { IpcHandlerSharedState } from './ipc-handlers/state';

export function registerIpcHandlers(mainWindow: BrowserWindow) {

    // --- 模块级状态 ---
    let currentFolderPath: string | null = null;
    let currentFilePath: string | null = null;
    let localPtyProcess: pty.IPty | null = null;
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    // --- 创建共享状态访问器 ---
    const stateAccess: IpcHandlerSharedState = {
        getFolder: () => currentFolderPath,
        setFolder: (path: string | null) => {
            currentFolderPath = path;
            console.log(`[State] currentFolderPath set to: ${path}`);
        },
        getFile: () => currentFilePath,
        setFile: (path: string | null) => {
            currentFilePath = path;
            console.log(`[State] currentFilePath set to: ${path}`);
        },
        getPty: () => localPtyProcess,
        setPty: (pty: pty.IPty | null) => { localPtyProcess = pty; },
        getShell: () => shell,
        getApp: () => app,
        getMainWindow: () => mainWindow,
    };

    // --- 注册所有 IPC 处理程序 ---
    registerAllIpcHandlers(ipcMain, stateAccess);

    // --- 注册跨模块的事件 (例如 Git Watcher) ---
    // Git 状态变化时通知渲染进程
    // (这个逻辑保持在顶层，因为它依赖 gitService 和 mainWindow)
    gitService.onGitStatusChange((statusMap) => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('git-status-change', statusMap);
        }
    });

    // --- 终端相关的窗口关闭处理 ---
    mainWindow.on('close', () => {
        console.log('[Main] Main window is closing, killing pty process...');
        if (localPtyProcess) {
            try { localPtyProcess.kill(); } catch(e) { console.error('[Main] Error killing pty on window close:', e); }
            localPtyProcess = null;
        }
    });
}