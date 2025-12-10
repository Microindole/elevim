// src/main/services/terminal.service.ts
import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import * as os from 'os';
import * as fs from 'fs';
import { app, BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { ITerminalService } from '../../shared/api-contract';
import { FileService } from './file.service';

export class TerminalService extends EventEmitter implements ITerminalService {
    private terminals: Map<string, pty.IPty> = new Map();
    private shell: string;
    private shellArgs: string[];

    constructor(private mainWindow: BrowserWindow, private fileService: FileService) {
        super();
        this.detectShell();

        // [关键] 全局异常拦截：静默处理 EPIPE 错误，防止应用崩溃
        process.on('uncaughtException', (error: any) => {
            if (error.code === 'EPIPE' || error.message.includes('EPIPE')) {
                // 这是一个预期的 Windows PTY 关闭错误，静默忽略即可
                // 如果你想看，可以取消下面这行的注释
                // console.warn('[Terminal] Suppressed background EPIPE error');
            } else {
                console.error('Uncaught exception:', error);
                // 对于其他未知严重错误，仍然抛出
                // process.exit(1); // 生产环境通常不希望直接退出，视情况而定
            }
        });
    }

    private detectShell() {
        if (os.platform() === 'win32') {
            const pwsh7 = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
            const pwsh5 = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

            if (fs.existsSync(pwsh7)) {
                this.shell = pwsh7;
                this.shellArgs = ['-NoLogo'];
            } else {
                this.shell = pwsh5;
                this.shellArgs = [
                    '-NoLogo', '-NoExit', '-Command',
                    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::InputEncoding = [System.Text.Encoding]::UTF8'
                ];
            }
        } else {
            this.shell = process.env.SHELL || '/bin/bash';
            this.shellArgs = ['--login'];
        }
    }

    async init(): Promise<void> { /* 兼容保留 */ }

    async createTerminal(options?: { cwd?: string }): Promise<string> {
        const termId = uuidv4();

        let cwd = options?.cwd;
        if (!cwd) cwd = this.fileService.getCurrentFolder();
        if (!cwd || !fs.existsSync(cwd)) cwd = app.getPath('home');

        // console.log(`[Terminal] Creating ${termId} at ${cwd}`);

        try {
            const ptyProcess = pty.spawn(this.shell, this.shellArgs, {
                name: 'xterm-256color',
                cols: 80,
                rows: 30,
                cwd: cwd,
                env: process.env as any
            });

            this.terminals.set(termId, ptyProcess);

            // 数据转发
            ptyProcess.onData((data) => {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.emit('data', { termId, data });
                }
            });

            // 退出清理
            ptyProcess.onExit(({ exitCode }) => {
                this.emit('exit', { termId, code: exitCode });
                this.terminals.delete(termId);
            });

            return termId;
        } catch (error) {
            console.error('[Terminal] Create failed:', error);
            throw error;
        }
    }

    async write(termId: string, data: string): Promise<void> {
        const term = this.terminals.get(termId);
        if (term) {
            try {
                term.write(data);
            } catch (err) {
                // 忽略写入时的并发错误
            }
        }
    }

    async resize(termId: string, cols: number, rows: number): Promise<void> {
        const term = this.terminals.get(termId);
        // 只有当尺寸有效且终端存在时才调整
        if (term && cols > 0 && rows > 0) {
            try {
                term.resize(Math.floor(cols), Math.floor(rows));
            } catch (err) {
                // 忽略调整时的并发错误
            }
        }
    }

    async dispose(termId: string): Promise<void> {
        const term = this.terminals.get(termId);
        if (!term) return;

        // 1. 立即移除引用
        this.terminals.delete(termId);

        try {
            // 2. 尝试暂停数据流 (黑科技修复)
            if (typeof (term as any).pause === 'function') {
                (term as any).pause();
            }

            // 3. 移除监听器
            (term as any).removeAllListeners();

            // 4. 杀死进程
            term.kill();
        } catch (error) {
            console.warn(`[Terminal] Dispose warn:`, error);
        }
    }

    async listTerminals(): Promise<string[]> {
        return Array.from(this.terminals.keys());
    }
}