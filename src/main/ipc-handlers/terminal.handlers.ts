// src/main/ipc-handlers/terminal.handlers.ts
import { IpcMain } from 'electron';
import * as pty from 'node-pty';
import { IpcHandlerSharedState } from './state';
import { terminalChannels, IPC_CHANNELS } from '../../shared/constants';

export const registerTerminalHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {

    let isPtyStarting = false;

    ipcMain.on(terminalChannels.INIT, () => {
        // 如果终端已经在运行，则复用，不重新创建
        if (state.getPty() || isPtyStarting) {
            console.warn('[Main] Ignoring redundant TERMINAL_INIT request.');
            return;
        }
        isPtyStarting = true;
        console.log('[Main] Received TERMINAL_INIT - attempting to spawn.');

        // 防御性清理：如果状态里有进程但实际上死了（虽然不太可能），先清理
        if (state.getPty()) {
            try { state.getPty()!.kill(); } catch (e) { console.error('[Main] Error killing existing pty:', e); }
            state.setPty(null);
        }

        try {
            const shell = state.getShell();
            const app = state.getApp();
            const mainWindow = state.getMainWindow();

            // --- [修改核心] 动态计算启动目录 (CWD) ---
            // 1. 尝试获取当前打开的项目文件夹路径
            const projectRoot = state.getFolder();

            // 2. 如果有打开的文件夹，就用它；如果没有，回退到操作系统默认的家目录 (Win11/Linux 通用)
            const cwd = projectRoot || app.getPath('home');

            console.log(`[Main] Spawning shell: ${shell} in ${cwd}`);

            const newPty = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: 80, rows: 30,
                cwd: cwd, // 使用动态计算的路径
                env: process.env
            });

            newPty.onData((data: string) => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_OUT, data);
                }
            });

            newPty.onExit(({ exitCode, signal }) => {
                console.log(`[Main] Pty process exited with code: ${exitCode}, signal: ${signal}`);
                if (state.getPty() === newPty) {
                    state.setPty(null);
                    isPtyStarting = false;
                }
            });

            state.setPty(newPty);
            isPtyStarting = false;
            console.log('[Main] Pty process spawned successfully');

        } catch (e) {
            console.error('[Main] Failed to spawn pty process:', e);
            state.setPty(null);
            isPtyStarting = false;
        }
    });

    ipcMain.on(terminalChannels.IN, (_event, data: string) => {
        if (state.getPty()) {
            state.getPty()!.write(data);
        }
    });

    ipcMain.on(terminalChannels.RESIZE, (_event, size: { cols: number, rows: number }) => {
        if (state.getPty() && size && size.cols > 0 && size.rows > 0) {
            try {
                state.getPty()!.resize(size.cols, size.rows);
            } catch (e) {
                console.error('[Main] Failed to resize pty:', e);
            }
        }
    });
};