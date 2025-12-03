// src/main/services/terminal.service.ts
import { EventEmitter } from 'events';
import * as pty from 'node-pty';
import * as os from 'os';
import * as fs from 'fs';
import { app, BrowserWindow } from 'electron';
import { ITerminalService } from '../../shared/api-contract';
import { FileService } from './file.service';

export class TerminalService extends EventEmitter implements ITerminalService {
    private ptyProcess: pty.IPty | null = null;
    private shell = os.platform() === 'win32'
        ? 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
        : (process.env.SHELL || '/bin/bash');

    // [新增] 初始化锁，防止前端并发调用导致进程泄漏
    private isInitializing = false;

    constructor(private mainWindow: BrowserWindow, private fileService: FileService) {
        super();
    }

    async init(): Promise<void> {
        // [关键修复] 如果正在初始化，直接忽略本次请求
        if (this.isInitializing) {
            console.log('[Terminal] Init ignored: already initializing.');
            return;
        }

        this.isInitializing = true;

        try {
            // 1. 彻底销毁旧进程
            await this.dispose();

            // 2. 计算路径
            const projectRoot = this.fileService.getCurrentFolder();
            let cwd = projectRoot || app.getPath('home');

            try {
                await fs.promises.access(cwd);
            } catch (e) {
                console.warn(`[Terminal] Invalid CWD "${cwd}", falling back to Home.`);
                cwd = app.getPath('home');
            }

            console.log(`[Terminal] Spawning ${this.shell} at ${cwd}`);

            // 3. 创建新进程
            this.ptyProcess = pty.spawn(this.shell, [], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                cwd: cwd,
                env: process.env as any
            });

            // 4. 绑定事件
            this.ptyProcess.onData((data) => {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.emit('data', data);
                }
            });

            this.ptyProcess.onExit(({ exitCode, signal }) => {
                console.log(`[Terminal] Exited: ${exitCode}, Signal: ${signal}`);
                // 不要在这里置空，防止与 dispose 冲突，让 dispose 全权管理
            });

        } catch (error: any) {
            console.error('[Terminal] Spawn Error:', error);
        } finally {
            // [关键] 无论成功失败，释放锁
            this.isInitializing = false;
        }
    }

    async write(data: string): Promise<void> {
        if (this.ptyProcess) {
            try { this.ptyProcess.write(data); } catch (e) {}
        }
    }

    async resize(cols: number, rows: number): Promise<void> {
        if (this.ptyProcess && cols > 0 && rows > 0) {
            try { this.ptyProcess.resize(Math.floor(cols), Math.floor(rows)); } catch (e) {}
        }
    }

    async dispose(): Promise<void> {
        if (this.ptyProcess) {
            console.log('[Terminal] Disposing PTY process...');
            // 移除监听器，防止 kill 时触发读错误
            (this.ptyProcess as any).removeAllListeners();

            try {
                this.ptyProcess.kill();
            } catch (e) {
                console.warn('[Terminal] Kill failed:', e);
            }

            this.ptyProcess = null;
            // 给予 OS 回收句柄的缓冲时间
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}