// src/main/ipc-handlers/terminal.handlers.ts
import { IpcMain } from 'electron';
import * as pty from 'node-pty';
import { IpcHandlerSharedState } from './state';

export const terminalChannels = {
    INIT: 'terminal:init',
    IN: 'terminal:in',
    RESIZE: 'terminal:resize',
};

export const registerTerminalHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {

    let isPtyStarting = false;

    ipcMain.on(terminalChannels.INIT, () => {
        if (state.getPty() || isPtyStarting) {
            console.warn('[Main] Ignoring redundant TERMINAL_INIT request.');
            return;
        }
        isPtyStarting = true;
        console.log('[Main] Received TERMINAL_INIT - attempting to spawn.');

        if (state.getPty()) {
            console.log('[Main] Killing existing pty process (unexpected)');
            try { state.getPty()!.kill(); } catch (e) { console.error('[Main] Error killing existing pty:', e); }
            state.setPty(null);
        }

        try {
            const shell = state.getShell();
            const app = state.getApp();
            const mainWindow = state.getMainWindow();

            console.log(`[Main] Spawning shell: ${shell} in ${app.getPath('home')}`);
            const newPty = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: 80, rows: 30,
                cwd: app.getPath('home'),
                env: process.env
            });

            newPty.onData((data: string) => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('terminal-out', data); // <-- 使用保留的事件
                }
            });

            newPty.onExit(({ exitCode, signal }) => {
                console.log(`[Main] Pty process exited with code: ${exitCode}, signal: ${signal}`);
                if (state.getPty() === newPty) {
                    state.setPty(null);
                    isPtyStarting = false;
                } else {
                    console.log("[Main] An older/orphaned pty process instance exited.");
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
        } else {
            console.warn('[Main] Attempted to write to non-existent pty process');
        }
    });

    ipcMain.on(terminalChannels.RESIZE, (_event, size: { cols: number, rows: number }) => {
        if (state.getPty() && size && typeof size.cols === 'number' && typeof size.rows === 'number' && size.cols > 0 && size.rows > 0) {
            try {
                state.getPty()!.resize(size.cols, size.rows);
            } catch (e) {
                console.error('[Main] Failed to resize pty:', e);
            }
        } else {
            console.warn('[Main] Invalid resize parameters received or pty not running:', size);
        }
    });
};