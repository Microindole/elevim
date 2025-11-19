// src/main/ipc-handlers/session.handlers.ts
import { IpcMain } from 'electron';
import { IpcHandlerSharedState } from './state';
import { getEditorSession, saveEditorSession, EditorSession } from '../lib/session';
import { sessionChannels } from '../../shared/constants';

export const registerSessionHandlers = (ipcMain: IpcMain, state: IpcHandlerSharedState) => {

    // 处理 session:get
    ipcMain.handle(sessionChannels.GET_SESSION, async () => {
        const session = getEditorSession();
        console.log('[Session] Loading session:', session ? 'Found' : 'Empty');
        return session;
    });

    // 处理 session:save
    ipcMain.on(sessionChannels.SAVE_SESSION, (_event, session: EditorSession) => {
        saveEditorSession(session);

        // 如果保存了当前打开的文件夹，也要同步更新主进程状态，
        // 这样其他模块（如 Git）也能知道当前文件夹是什么
        if (session.currentFolderPath) {
            state.setFolder(session.currentFolderPath);
        }
    });
};