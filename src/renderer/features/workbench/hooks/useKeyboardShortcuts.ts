// src/renderer/features/workbench/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { Keymap } from '../../../../shared/types';
import { CommandRegistry } from '../commands/types';

interface UseKeyboardShortcutsProps {
    keymap: Keymap | undefined;
    commandRegistry: CommandRegistry;
}

function checkKey(e: KeyboardEvent, shortcut: string): boolean {
    if (!shortcut) return false;
    const parts = shortcut.toLowerCase().split('+');
    const key = parts.pop();

    // 处理特殊字符的映射
    if (e.key.toLowerCase() !== key) {
        return false;
    }

    const ctrl = parts.includes('ctrl');
    const shift = parts.includes('shift');
    const alt = parts.includes('alt');
    const meta = parts.includes('meta');

    // 严格匹配修饰键
    return ctrl === e.ctrlKey && shift === e.shiftKey && alt === e.altKey && meta === e.metaKey;
}

export function useKeyboardShortcuts({ keymap, commandRegistry }: UseKeyboardShortcutsProps) {
    useEffect(() => {
        if (!keymap) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // 遍历所有按键配置
            for (const [id, shortcut] of Object.entries(keymap)) {
                // 如果按键匹配
                if (checkKey(e, shortcut)) {
                    // 在注册表中查找对应的实现函数
                    // @ts-ignore
                    const handler = commandRegistry[id];
                    if (handler) {
                        e.preventDefault();
                        // console.log(`[Shortcut] Triggered: ${id}`);
                        handler();
                        return; // 匹配到一个后停止，防止冲突
                    }
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [keymap, commandRegistry]);
}