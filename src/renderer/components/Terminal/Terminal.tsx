// src/renderer/components/Terminal/Terminal.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import './Terminal.css';

export default function TerminalComponent() {
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminalInstance = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const initIpcSent = useRef(false);

    useEffect(() => {
        if (!terminalRef.current || terminalInstance.current) return;
        const termContainer = terminalRef.current;
        console.log('[Renderer] TerminalComponent useEffect run');

        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#007acc',
                selectionBackground: '#3e3e42',
                selectionForeground: '#ffffff'
            }
        });

        const addon = new FitAddon();
        term.loadAddon(addon);
        term.open(terminalRef.current);
        terminalInstance.current = term;
        fitAddon.current = addon;

        if (!initIpcSent.current) {
            console.log('[Renderer] Calling terminalInit via IPC');
            window.electronAPI.terminal.terminalInit(); // MODIFIED
            initIpcSent.current = true;
        }

        term.onData((data) => {
            if (terminalInstance.current) {
                window.electronAPI.terminal.terminalWrite(data); // MODIFIED
            }
        });

        const unregisterOnData = window.electronAPI.terminal.onTerminalData((data) => { // MODIFIED
            if (terminalInstance.current) {
                terminalInstance.current?.write(data);
            }
        });

        // 8. Handle resize (as before)
        const handleResize = () => {
            if (fitAddon.current && terminalInstance.current) {
                try {
                    fitAddon.current?.fit();

                    // 通知主进程的 PTY 终端尺寸变了
                    const { cols, rows } = terminalInstance.current;
                    if (cols > 0 && rows > 0) {
                        window.electronAPI.terminal.terminalResize({ cols, rows }); // MODIFIED
                    }
                } catch (e) {
                    console.error('[Renderer] Error during terminal fit/resize:', e);
                }
            }
        };

        // 监视 .terminal-wrapper 元素
        const resizeObserver = new ResizeObserver(() => {
            // 使用 setTimeout 避免 "ResizeObserver loop limit exceeded" 错误
            setTimeout(() => handleResize(), 0);
        });

        // 开始观察
        resizeObserver.observe(termContainer);

        // 同时也监听窗口 resize
        window.addEventListener('resize', handleResize);
        handleResize();

        // 9. Cleanup (as before)
        return () => {
            console.log('[Renderer] TerminalComponent cleanup executing');
            resizeObserver.unobserve(termContainer);
            unregisterOnData();
            window.removeEventListener('resize', handleResize);

            if (terminalInstance.current) {
                terminalInstance.current?.dispose();
                console.log('[Renderer] xterm instance disposed');
            }

            terminalInstance.current = null;
            fitAddon.current = null;
            initIpcSent.current = false;
            console.log('[Renderer] TerminalComponent cleanup finished');
        };
    }, []);

    return (
        <div className="terminal-container">
            <div ref={terminalRef} className="terminal-wrapper" />
        </div>
    );
}