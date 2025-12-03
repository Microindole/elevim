// src/main/lib/lsp-manager.ts
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn } from 'child_process';
import * as rpc from 'vscode-jsonrpc/node';

// 调试开关：开启后会在控制台打印所有 LSP 通信日志
const DEBUG_LSP = true;

interface LanguageServerSession {
    process: ChildProcess;
    connection: rpc.MessageConnection;
    isInitialized: boolean;
}

// 使用 Map 管理多个语言服务实例
const sessions = new Map<string, LanguageServerSession>();

// 服务器配置表
const SERVER_MAP: Record<string, { bin: string; args: string[] }> = {
    'typescript': {
        bin: process.platform === 'win32' ? 'typescript-language-server.cmd' : 'typescript-language-server',
        args: ['--stdio']
    },
    'javascript': { // 复用 TS Server
        bin: process.platform === 'win32' ? 'typescript-language-server.cmd' : 'typescript-language-server',
        args: ['--stdio']
    },
    'python': {
        bin: process.platform === 'win32' ? 'pyright-langserver.cmd' : 'pyright-langserver',
        args: ['--stdio']
    },
    'html': {
        bin: process.platform === 'win32' ? 'vscode-html-language-server.cmd' : 'vscode-html-language-server',
        args: ['--stdio']
    },
    'css': {
        bin: process.platform === 'win32' ? 'vscode-css-language-server.cmd' : 'vscode-css-language-server',
        args: ['--stdio']
    },
    'json': {
        bin: process.platform === 'win32' ? 'vscode-json-language-server.cmd' : 'vscode-json-language-server',
        args: ['--stdio']
    }
};

export function startLspServer(languageId: string, onNotification: (method: string, params: any) => void) {
    if (sessions.has(languageId)) return;

    const config = SERVER_MAP[languageId];
    if (!config) return;

    console.log(`[LSP] Starting server for ${languageId}...`);

    // 确保路径指向 node_modules/.bin
    const localBin = path.join(process.cwd(), 'node_modules', '.bin', config.bin);
    const serverPath = fs.existsSync(localBin) ? localBin : config.bin;

    console.log(`[LSP] Server executable path: ${serverPath}`);

    try {
        const proc = spawn(serverPath, config.args, {
            cwd: process.cwd(),
            shell: true,
            env: process.env
        });

        proc.on('error', (err) => {
            console.error(`[LSP] Process error for ${languageId}:`, err);
        });

        proc.on('exit', (code, signal) => {
            console.log(`[LSP] ${languageId} process exited with code ${code} and signal ${signal}`);
            sessions.delete(languageId);
        });

        const connection = rpc.createMessageConnection(
            new rpc.StreamMessageReader(proc.stdout),
            new rpc.StreamMessageWriter(proc.stdin)
        );

        const session: LanguageServerSession = {
            process: proc,
            connection: connection,
            isInitialized: false
        };
        sessions.set(languageId, session);

        connection.listen();

        connection.onNotification((method, params) => {
            if (DEBUG_LSP && method !== 'textDocument/publishDiagnostics') {
                // console.log(`[LSP-In][${languageId}] Notification: ${method}`);
            }
            onNotification(method, params);
        });

        // 2. [新增] 关键修复：监听 Request (双向请求)
        // Pyright 启动后会立即发 workspace/configuration 请求，必须回复！
        connection.onRequest((method, params: any) => {
            if (DEBUG_LSP) console.log(`[LSP-Request-In][${languageId}] ${method}`);

            if (method === 'workspace/configuration') {
                // Pyright 询问配置，我们返回空数组
                // 修正 map 函数的写法: map(() => ({}))
                return Array.isArray(params.items) ? params.items.map(() => ({})) : [];
            }

            if (method === 'client/registerCapability') {
                return null;
            }

            return null;
        });
        console.log(`[LSP] ${languageId} Server started.`);

        connection.onClose(() => {
            console.log(`[LSP] Connection closed for ${languageId}`);
            sessions.delete(languageId);
        });

    } catch (e) {
        console.error(`[LSP] Failed to start server for ${languageId}:`, e);
    }
}

export function sendToLsp(languageId: string, message: any) {
    const session = sessions.get(languageId);
    if (!session) return;

    if (message.method === 'initialize') {
        if (session.isInitialized) return;
        session.isInitialized = true;
    }

    if (message.id !== undefined) {
        session.connection.sendRequest(message.method, message.params).catch(console.error);
    } else {
        session.connection.sendNotification(message.method, message.params);
    }
}

export async function sendRequestToLsp(languageId: string, message: any) {
    const session = sessions.get(languageId);
    if (!session) return null;
    try {
        return await session.connection.sendRequest(message.method, message.params);
    } catch (e) {
        console.error(`[LSP] Request failed:`, e);
        return null;
    }
}