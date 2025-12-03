import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { ILspService } from '../../shared/api-contract';
import * as lspManager from '../lib/lsp-manager';
import { IPC_CHANNELS } from '../../shared/constants';

export class LspService extends EventEmitter implements ILspService {
    constructor(private mainWindow: BrowserWindow) {
        super();
        // 拦截 LSP Manager 发送的 IPC 消息，转为 RPC 事件
        // 这是一个临时的 Hack，因为 lsp-manager 是直接操作 webContents 的
        // 更好的做法是重构 lsp-manager，但为了少改动，我们在 preload 处理
        // 或者我们在这里做一个中转：监听 webContents 的 ipc-message (比较复杂)

        // 简单的方案：修改 lsp-manager.ts，让它接受一个回调而不是直接发 IPC
        // 这里暂时假设 lsp-manager 还是发 IPC_CHANNELS.LSP_NOTIFICATION
        // 我们在 preload 中处理这个事件转发。
    }

    async start(languageId: string) {
        lspManager.startLspServer(languageId, (method, params) => {
            this.emit('notification', languageId, method, params);
        });
    }

    async send(languageId: string, message: any) {
        lspManager.sendToLsp(languageId, message);
    }

    async request(languageId: string, message: any) {
        return await lspManager.sendRequestToLsp(languageId, message);
    }
}