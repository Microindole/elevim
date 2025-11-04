// src/renderer/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { SidebarView } from '../components/ActivityBar/ActivityBar';

interface UseKeyboardShortcutsProps {
    setIsPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsTerminalVisible: React.Dispatch<React.SetStateAction<boolean>>;
    handleViewChange: (view: SidebarView) => void;
}

export function useKeyboardShortcuts({
                                         setIsPaletteOpen,
                                         setIsTerminalVisible,
                                         handleViewChange
                                     }: UseKeyboardShortcutsProps) {
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ctrl + Shift + P - 命令面板
            if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
            }

            // Ctrl + ` - 终端
            if (e.ctrlKey && e.key === '`') {
                e.preventDefault();
                setIsTerminalVisible(prev => !prev);
            }

            // Ctrl + Shift + G - Git 面板
            if (e.ctrlKey && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
                e.preventDefault();
                handleViewChange('git');
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [setIsPaletteOpen, setIsTerminalVisible, handleViewChange]);
}