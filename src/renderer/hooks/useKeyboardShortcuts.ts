// src/renderer/hooks/useKeyboardShortcuts.ts
import {useEffect} from 'react';
import {SidebarView} from '../components/ActivityBar/ActivityBar';
import {Keymap} from '../../shared/types';

interface UseKeyboardShortcutsProps {
    keymap: Keymap | undefined; // 允许 undefined
    setIsPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsTerminalVisible: React.Dispatch<React.SetStateAction<boolean>>;
    handleViewChange: (view: SidebarView) => void;
    handleMenuNewFile: () => void;
    handleMenuOpenFile: () => void;
    handleMenuOpenFolder: () => void;
    handleSave: () => void;
    handleMenuSaveAsFile: () => void;
    handleMenuCloseWindow: () => void;
    splitEditor: () => void; // <--- 新增
}

function checkKey(e: KeyboardEvent, shortcut: string): boolean {
    if (!shortcut) return false;
    const parts = shortcut.toLowerCase().split('+');
    const key = parts.pop();

    // 处理特殊字符的映射 (比如 \ 键在 keydown 事件中可能不同)
    // 这里简化处理，通常 e.key 就是用户按下的键
    if (e.key.toLowerCase() !== key) {
        return false;
    }

    const ctrl = parts.includes('ctrl');
    const shift = parts.includes('shift');
    const alt = parts.includes('alt');
    const meta = parts.includes('meta');

    if (ctrl !== e.ctrlKey) return false;
    if (shift !== e.shiftKey) return false;
    if (alt !== e.altKey) return false;
    if (meta !== e.metaKey) return false;

    return true;
}

export function useKeyboardShortcuts(props: UseKeyboardShortcutsProps) {
    const {keymap} = props;

    useEffect(() => {
        if (!keymap) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (checkKey(e, keymap['view.togglePalette'])) {
                e.preventDefault();
                props.setIsPaletteOpen(prev => !prev);
            }
            if (checkKey(e, keymap['view.toggleTerminal'])) {
                e.preventDefault();
                props.setIsTerminalVisible(prev => !prev);
            }
            if (checkKey(e, keymap['view.toggleGitPanel'])) {
                e.preventDefault();
                props.handleViewChange('git');
            }
            if (checkKey(e, keymap['view.toggleSearchPanel'])) {
                e.preventDefault();
                props.handleViewChange('search');
            }
            if (checkKey(e, keymap['file.new'])) {
                e.preventDefault();
                props.handleMenuNewFile();
            }
            if (checkKey(e, keymap['file.open'])) {
                e.preventDefault();
                props.handleMenuOpenFile();
            }
            if (checkKey(e, keymap['file.openFolder'])) {
                e.preventDefault();
                props.handleMenuOpenFolder();
            }
            if (checkKey(e, keymap['file.save'])) {
                e.preventDefault();
                props.handleSave();
            }
            if (checkKey(e, keymap['file.saveAs'])) {
                e.preventDefault();
                props.handleMenuSaveAsFile();
            }
            if (checkKey(e, keymap['app.quit'])) {
                e.preventDefault();
                props.handleMenuCloseWindow();
            }

            // 新增：分屏
            if (checkKey(e, keymap['view.splitEditor'])) {
                e.preventDefault();
                props.splitEditor();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [keymap, props]); // 简化依赖数组
}