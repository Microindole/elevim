// src/main/ipc-handlers/lsp.handlers.ts
import { IpcMain } from 'electron';
import { IpcHandlerSharedState } from './state';
import * as lspManager from '../lib/lsp-manager';
import { lspChannels } from '../../shared/constants';

export const registerLspHandlers: (ipcMain: IpcMain, state: IpcHandlerSharedState) => void = (
    ipcMain,
    state
) => {
    ipcMain.on(lspChannels.START, (_event, languageId: string) => {
        lspManager.startLspServer(state.getMainWindow(), languageId);
    });

    ipcMain.on(lspChannels.SEND, (_event, payload: { languageId: string, message: any }) => {
        lspManager.sendToLsp(payload.languageId, payload.message);
    });

    ipcMain.handle(lspChannels.REQUEST, async (_event, payload: { languageId: string, message: any }) => {
        return await lspManager.sendRequestToLsp(payload.languageId, payload.message);
    });
};