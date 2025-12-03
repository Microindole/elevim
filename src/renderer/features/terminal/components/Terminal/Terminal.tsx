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

    // [状态追踪]
    const isInitialized = useRef(false); // xterm 是否创建
    const backendInited = useRef(false); // 后端是否已请求初始化

    useEffect(() => {
        if (!terminalRef.current || isInitialized.current) return;

        // 如果容器不可见，暂不初始化
        if (terminalRef.current.clientWidth === 0) return;

        isInitialized.current = true;

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

        // 挂载
        term.open(terminalRef.current);
        terminalInstance.current = term;
        fitAddon.current = addon;

        // [关键修复] 只调用一次 init，使用 backendInited 标记
        if (!backendInited.current) {
            backendInited.current = true;
            // 给一点延迟，让之前的 dispose 跑完
            setTimeout(() => {
                api.terminal.init().catch(console.error);
            }, 100);
        }

        // 数据流
        const onData = term.onData((data) => {
            api.terminal.write(data);
        });

        const unsubscribe = api.terminal.on('data', (data: string) => {
            terminalInstance.current?.write(data);
        });

        // 尺寸适配
        const handleResize = () => {
            if (!terminalRef.current || !fitAddon.current || !terminalInstance.current) return;
            if (terminalRef.current.clientWidth === 0) return;

            requestAnimationFrame(() => {
                try {
                    fitAddon.current?.fit();
                    const { cols, rows } = terminalInstance.current!;
                    if (cols > 0 && rows > 0) {
                        api.terminal.resize(cols, rows);
                    }
                } catch {}
            });
        };

        // 使用 ResizeObserver 仅用于触发 resize，不用于触发 init
        const observer = new ResizeObserver(() => handleResize());
        observer.observe(terminalRef.current);
        window.addEventListener('resize', handleResize);

        // 初始适配
        setTimeout(() => handleResize(), 150);

        return () => {
            console.log('[Terminal] Component Unmount');
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
            unsubscribe();
            onData.dispose();
            term.dispose();

            terminalInstance.current = null;
            isInitialized.current = false;
            backendInited.current = false;

            // 卸载时通知后端销毁
            api.terminal.dispose().catch(console.error);
        };
    }, []);

    return (
        <div className="terminal-container">
            <div ref={terminalRef} className="terminal-wrapper" style={{ width: '100%', height: '100%' }} />
        </div>
    );
}