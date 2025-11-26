// src/main/ipc-handlers/index.ts
import { IpcMain } from 'electron';
import { IpcHandlerRegistrar, IpcHandlerSharedState } from './state';
import { registerGitHubHandlers } from './github.handlers';

// 1. 导入所有模块的注册函数
import { registerFileHandlers } from './file.handlers';
import { registerGitHandlers } from './git.handlers';
import { registerMenuHandlers } from './menu.handlers';
import { registerSettingsHandlers } from './settings.handlers';
import { registerTerminalHandlers } from './terminal.handlers';
import { registerWindowHandlers } from './window.handlers';
import { registerSessionHandlers } from './session.handlers';
import { registerLspHandlers } from './lsp.handlers';

// 2. 创建一个注册函数列表
const registrars: IpcHandlerRegistrar[] = [
    registerFileHandlers,
    registerGitHandlers,
    registerMenuHandlers,
    registerSettingsHandlers,
    registerTerminalHandlers,
    registerWindowHandlers,
    registerGitHubHandlers,
    registerSessionHandlers,
    registerLspHandlers
];

// 3. 导出一个总注册函数
export function registerAllIpcHandlers(
    ipcMain: IpcMain,
    state: IpcHandlerSharedState
) {
    console.log('[IPC Registrar] Registering all modules...');
    for (const register of registrars) {
        try {
            register(ipcMain, state);
        } catch (e: any) {
            console.error(`[IPC Registrar] Failed to register module: ${e.message}`);
        }
    }
    console.log('[IPC Registrar] All modules registered.');
}