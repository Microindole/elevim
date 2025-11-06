// src/renderer/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { SidebarView } from '../components/ActivityBar/ActivityBar';
import { Keymap } from '../../shared/types';

interface UseKeyboardShortcutsProps {
    keymap: Keymap;
    setIsPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsTerminalVisible: React.Dispatch<React.SetStateAction<boolean>>;
    handleViewChange: (view: SidebarView) => void;
}

function checkKey(e: KeyboardEvent, shortcut: string): boolean {
    if (!shortcut) return false
    const parts = shortcut.toLowerCase().split('+');
    const key = parts.pop(); // 最后一部分是按键

    if (e.key.toLowerCase() !== key) {
        return false;
    }
    // 检查修饰键 (Ctrl, Shift, Alt, Meta)
    if (parts.includes('ctrl') !== e.ctrlKey) return false;
    if (parts.includes('shift') !== e.shiftKey) return false;
    if (parts.includes('alt') !== e.altKey) return false;
    if (parts.includes('meta') !== e.metaKey) return false; // Meta = Cmd on Mac

    return true;
}

export function useKeyboardShortcuts({
    keymap,
    setIsPaletteOpen,
    setIsTerminalVisible,
    handleViewChange
}: UseKeyboardShortcutsProps) {
    useEffect(() => {
        if (!keymap) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {

            if (checkKey(e, keymap['view.togglePalette'])) {
                e.preventDefault();
                setIsPaletteOpen(prev => !prev);
            }

            if (checkKey(e, keymap['view.toggleTerminal'])) {
                e.preventDefault();
                setIsTerminalVisible(prev => !prev);
            }

            if (checkKey(e, keymap['view.toggleGitPanel'])) {
                e.preventDefault();
                handleViewChange('git');
            }

            // (你也可以在这里添加 file.new, file.open 等...)
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [keymap, setIsPaletteOpen, setIsTerminalVisible, handleViewChange]); // <-- 依赖项改为 keymap
}