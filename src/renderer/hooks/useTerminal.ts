// src/renderer/hooks/useTerminal.ts
import { useState, useCallback, useRef, useEffect } from 'react';

export function useTerminal() {
    const [terminalHeight, setTerminalHeight] = useState(200);
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);
    const isResizingTerminal = useRef(false);

    const startTerminalResize = useCallback(() => {
        isResizingTerminal.current = true;
    }, []);

    const stopTerminalResize = useCallback(() => {
        isResizingTerminal.current = false;
    }, []);

    const resizeTerminal = useCallback((e: MouseEvent) => {
        if (isResizingTerminal.current) {
            const newHeight = window.innerHeight - e.clientY;
            setTerminalHeight(Math.max(30, newHeight));
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