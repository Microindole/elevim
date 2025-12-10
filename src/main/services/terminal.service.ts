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
    private shell: string;
    private shellArgs: string[];

    private isInitializing = false;
    private isProcessAlive = false;

    constructor(private mainWindow: BrowserWindow, private fileService: FileService) {
        super();

        // 根据平台选择 shell
        if (os.platform() === 'win32') {
            // 优先使用 PowerShell 7 (pwsh)，其 UTF-8 支持更好
            const pwsh7 = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
            const pwsh5 = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

            if (fs.existsSync(pwsh7)) {
                this.shell = pwsh7;
                // pwsh 7 默认就是 UTF-8，只需添加 -NoLogo
                this.shellArgs = ['-NoLogo'];
            } else {
                // PowerShell 5 需要通过配置文件或启动参数设置 UTF-8
                this.shell = pwsh5;
                this.shellArgs = [
                    '-NoLogo',
                    '-NoExit',  // [关键] 保持交互模式
                    '-Command',
                    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::InputEncoding = [System.Text.Encoding]::UTF8'
                ];
            }
        } else {
            this.shell = process.env.SHELL || '/bin/bash';
            this.shellArgs = [];
        }
    }

    async init(): Promise<void> {
        if (this.isInitializing) {
            console.log('[Terminal] Init ignored: already initializing.');
            return;
        }

        if (this.ptyProcess && this.isProcessAlive) {
            console.log('[Terminal] Process already running, reusing.');
            return;
        }

        this.isInitializing = true;

        try {
            await this.dispose();

            const projectRoot = this.fileService.getCurrentFolder();
            let cwd = projectRoot || app.getPath('home');

            try {
                await fs.promises.access(cwd);
            } catch (e) {
                console.warn(`[Terminal] Invalid CWD "${cwd}", falling back to Home.`);
                cwd = app.getPath('home');
            }

            console.log(`[Terminal] Spawning ${this.shell} with args:`, this.shellArgs);

            this.ptyProcess = pty.spawn(this.shell, this.shellArgs, {
                name: 'xterm-256color',
                cols: 80,
                rows: 30,
                cwd: cwd,
                env: process.env as any
            });

            this.isProcessAlive = true;
            console.log('[Terminal] PTY process spawned successfully');

            this.ptyProcess.onData((data) => {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    try {
                        this.emit('data', data);
                    } catch (err) {
                        console.error('[Terminal] Data emit error:', err);
                    }
                }
            });

            this.ptyProcess.onExit(({ exitCode, signal }) => {
                console.log(`[Terminal] Process exited: code=${exitCode}, signal=${signal}`);
                this.isProcessAlive = false;
                this.ptyProcess = null;
            });

        } catch (error: any) {
            console.error('[Terminal] Spawn Error:', error);
            this.ptyProcess = null;
            this.isProcessAlive = false;
        } finally {
            this.isInitializing = false;
        }
    }

    async write(data: string): Promise<void> {
        if (this.ptyProcess && this.isProcessAlive) {
            try {
                this.ptyProcess.write(data);
            } catch (e) {
                console.error('[Terminal] Write failed:', e);
                this.isProcessAlive = false;
            }
        }
    }

    async resize(cols: number, rows: number): Promise<void> {
        if (this.ptyProcess && this.isProcessAlive && cols > 0 && rows > 0) {
            try {
                this.ptyProcess.resize(Math.floor(cols), Math.floor(rows));
            } catch (e) {
                console.error('[Terminal] Resize failed:', e);
            }
        }
    }

    async dispose(): Promise<void> {
        if (this.ptyProcess) {
            console.log('[Terminal] Disposing PTY process...');
            const proc = this.ptyProcess;

            this.ptyProcess = null;
            this.isProcessAlive = false;

            try {
                (proc as any).removeAllListeners();
                proc.kill();
            } catch (e) {
                console.warn('[Terminal] Kill failed:', e);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}