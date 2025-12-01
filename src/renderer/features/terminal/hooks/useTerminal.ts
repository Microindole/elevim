// src/renderer/features/terminal/hooks/useTerminal.ts
import { useState, useCallback, useRef, useEffect } from 'react';

export function useTerminal() {
    const [terminalHeight, setTerminalHeight] = useState(200);
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);
    const isResizingTerminal = useRef(false);

    const startTerminalResize = useCallback(() => {
        isResizingTerminal.current = true;
        // 为了防止拖拽时选中文本，可以在这里临时给 body 添加 user-select: none
        document.body.style.userSelect = 'none';
    }, []);

    const stopTerminalResize = useCallback(() => {
        isResizingTerminal.current = false;
        document.body.style.userSelect = '';
    }, []);

    const resizeTerminal = useCallback((e: MouseEvent) => {
        if (isResizingTerminal.current) {
            // 1. 动态获取状态栏高度，而不是写死 22
            const statusBar = document.querySelector('.status-bar-container');
            const statusBarHeight = statusBar ? statusBar.clientHeight : 22;

            // 2. 计算逻辑：
            // 窗口总高度 - 鼠标当前Y坐标 - 状态栏高度 = 终端面板应有的高度
            const newHeight = window.innerHeight - e.clientY - statusBarHeight;

            // 3. 限制最小高度 (例如 30px) 和最大高度 (例如窗口的 80%)
            const maxHeight = window.innerHeight * 0.8;
            setTerminalHeight(Math.max(30, Math.min(newHeight, maxHeight)));
        }
    }, []);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => resizeTerminal(e);
        const handleUp = () => stopTerminalResize();

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [resizeTerminal, stopTerminalResize]);

    return {
        terminalHeight,
        isTerminalVisible,
        setIsTerminalVisible,
        startTerminalResize
    };
}