// src/renderer/features/terminal/components/Terminal/TerminalInstance.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { api } from '../../../../utils/rpc-client';

interface Props {
    termId: string;
    visible: boolean;
    onTitleChange?: (title: string) => void;
}

export const TerminalInstance: React.FC<Props> = ({ termId, visible, onTitleChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const isRendered = useRef(false);
    const resizeObserver = useRef<ResizeObserver | null>(null);

    // 辅助函数：执行适配和同步
    const fitAndResize = () => {
        if (!xtermRef.current || !fitAddonRef.current || !visible) return;

        try {
            fitAddonRef.current.fit(); // 计算前端尺寸
            const { cols, rows } = xtermRef.current;

            // 只有尺寸有效时才发送给后端
            if (cols > 0 && rows > 0) {
                api.terminal.resize(termId, cols, rows).catch(err => {
                    console.warn('[Terminal] Resize sync failed:', err);
                });
            }
        } catch (e) {
            console.error('[Terminal] Fit error:', e);
        }
    };

    useEffect(() => {
        if (!containerRef.current || isRendered.current) return;
        isRendered.current = true;

        // 1. 初始化 xterm
        const term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
            theme: { background: '#1e1e1e', foreground: '#cccccc' },
            allowProposedApi: true
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // [修复] 不使用 WebglAddon，防止 Context 丢失导致的崩溃

        term.open(containerRef.current);
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // 2. 监听标题
        term.onTitleChange((title) => onTitleChange && onTitleChange(title));

        // 3. 监听输入
        term.onData(data => api.terminal.write(termId, data));

        // 4. 监听后端输出
        const unsubscribe = api.terminal.on('data', (payload: any) => {
            if (payload && payload.termId === termId) {
                term.write(payload.data);
            }
        });

        // 5. [关键修复] 使用 ResizeObserver 监听容器大小变化
        // 这比 window.onresize 更准确，能响应侧边栏拖动等布局变化
        resizeObserver.current = new ResizeObserver(() => {
            // 使用 requestAnimationFrame 避免高频触发
            requestAnimationFrame(() => fitAndResize());
        });
        resizeObserver.current.observe(containerRef.current);

        // 初始适配
        setTimeout(() => fitAndResize(), 50);

        return () => {
            unsubscribe();
            resizeObserver.current?.disconnect();
            term.dispose();
            isRendered.current = false;
        };
    }, [termId]);

    // 6. 当 Tab 切换可见性变化时，强制重新计算尺寸
    useEffect(() => {
        if (visible) {
            requestAnimationFrame(() => {
                fitAndResize();
                xtermRef.current?.focus();
            });
        }
    }, [visible]);

    return (
        <div
            className="terminal-instance-wrapper"
            ref={containerRef}
            style={{
                display: visible ? 'block' : 'none',
                height: '100%',
                width: '100%'
            }}
        />
    );
};