// src/renderer/features/terminal/components/Terminal/Terminal.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import './Terminal.css';
import { api } from '../../../../utils/rpc-client';

export default function TerminalComponent() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalInstance = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);

    const isInitialized = useRef(false);
    const backendInited = useRef(false);

    useEffect(() => {
        console.log('[Terminal UI] useEffect triggered');

        if (!terminalRef.current || isInitialized.current) {
            console.log('[Terminal UI] Skipping: ref or already initialized');
            return;
        }

        if (terminalRef.current.clientWidth === 0) {
            console.log('[Terminal UI] Skipping: container width is 0');
            return;
        }

        isInitialized.current = true;
        console.log('[Terminal UI] Starting initialization...');

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
            },
            allowProposedApi: true
        });

        const addon = new FitAddon();
        term.loadAddon(addon);
        term.open(terminalRef.current);

        terminalInstance.current = term;
        fitAddon.current = addon;

        console.log('[Terminal UI] xterm created and opened');

        // 测试输出
        term.writeln('\x1b[33m[Debug] Terminal UI initialized, waiting for backend...\x1b[0m');

        // 后端初始化
        if (!backendInited.current) {
            backendInited.current = true;
            console.log('[Terminal UI] Calling api.terminal.init()...');

            setTimeout(() => {
                api.terminal.init()
                    .then(() => {
                        console.log('[Terminal UI] Backend init SUCCESS');
                        term.writeln('\x1b[32m[Debug] Backend connected\x1b[0m');
                    })
                    .catch(err => {
                        console.error('[Terminal UI] Backend init FAILED:', err);
                        term.writeln('\x1b[31m[Debug] Backend init failed: ' + err.message + '\x1b[0m');
                    });
            }, 150);
        }

        // 数据流 - 添加日志
        const onData = term.onData((data) => {
            console.log('[Terminal UI] User input, length:', data.length);
            api.terminal.write(data).catch(err => {
                console.error('[Terminal UI] Write failed:', err);
            });
        });

        const unsubscribe = api.terminal.on('data', (data: string) => {
            console.log('[Terminal UI] Received data from backend, length:', data.length, 'preview:', data.substring(0, 50));
            terminalInstance.current?.write(data);
        });

        console.log('[Terminal UI] Event listeners registered');

        // 尺寸适配
        const handleResize = () => {
            if (!terminalRef.current || !fitAddon.current || !terminalInstance.current) return;
            if (terminalRef.current.clientWidth === 0) return;

            requestAnimationFrame(() => {
                try {
                    fitAddon.current?.fit();
                    const { cols, rows } = terminalInstance.current!;
                    console.log('[Terminal UI] Resized to:', cols, 'x', rows);
                    if (cols > 0 && rows > 0) {
                        api.terminal.resize(cols, rows).catch(console.error);
                    }
                } catch (err) {
                    console.error('[Terminal UI] Resize failed:', err);
                }
            });
        };

        const observer = new ResizeObserver(() => handleResize());
        observer.observe(terminalRef.current);
        window.addEventListener('resize', handleResize);

        setTimeout(() => handleResize(), 200);

        return () => {
            console.log('[Terminal UI] Component Unmount - cleaning up');
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
            unsubscribe();
            onData.dispose();
            term.dispose();

            terminalInstance.current = null;
            isInitialized.current = false;

            // [关键] 不要在卸载时 dispose 后端进程
            // 只在真正关闭应用时才销毁
            // setTimeout(() => {
            //     console.log('[Terminal UI] Calling api.terminal.dispose()');
            //     api.terminal.dispose().catch(console.error);
            // }, 50);
        };
    }, []);

    return (
        <div className="terminal-container">
            <div ref={terminalRef} className="terminal-wrapper" style={{ width: '100%', height: '100%' }} />
        </div>
    );
}