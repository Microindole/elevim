// src/renderer/hooks/useSidebar.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { SidebarView } from '../components/ActivityBar/ActivityBar';

export function useSidebar() {
    const [sidebarWidth, setSidebarWidth] = useState(250);
    const [activeSidebarView, setActiveSidebarView] = useState<SidebarView>('explorer');
    const isResizing = useRef(false);

    const handleViewChange = useCallback((view: SidebarView) => {
        setActiveSidebarView(prev => (prev === view ? null : view));
    }, []);

    const startResizing = useCallback(() => {
        isResizing.current = true;
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing.current) {
            setSidebarWidth(e.clientX);
        }
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return {
        sidebarWidth,
        activeSidebarView,
        setActiveSidebarView,
        handleViewChange,
        startResizing
    };
}