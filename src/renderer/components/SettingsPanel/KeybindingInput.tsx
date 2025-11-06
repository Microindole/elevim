// src/renderer/components/SettingsPanel/KeybindingInput.tsx
import React, { useState, useEffect, useRef } from 'react';
import './KeybindingInput.css';

interface KeybindingInputProps {
    value: string;
    onChange: (newValue: string) => void;
}

// 辅助函数：将按键事件转换为 "Ctrl+Shift+K" 格式
function formatShortcut(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Meta'); // (Mac 上的 Command)

    // 避免只记录 "Ctrl" 或 "Shift"
    const key = e.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
        // 将 "ArrowUp" 转换为 "ArrowUp" (首字母大写)
        const displayKey = e.key.length === 1 ? key : e.key;
        parts.push(displayKey);
    }

    return parts.join('+');
}

export default function KeybindingInput({ value, onChange }: KeybindingInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    // 当 isListening 状态改变时，添加或移除全局监听器
    useEffect(() => {
        if (isListening) {
            // 设一个超时，如果用户 5 秒不按键，自动取消
            const timeoutId = setTimeout(() => {
                setIsListening(false);
                setTempValue(value); // 恢复原始值
            }, 5000);

            const handleKeyDown = (e: KeyboardEvent) => {
                e.preventDefault(); // 阻止按键的默认行为 (比如 Ctrl+S 保存)
                e.stopPropagation();

                const shortcut = formatShortcut(e);
                setTempValue(shortcut); // 实时显示用户正在按的组合键
            };

            const handleKeyUp = (e: KeyboardEvent) => {
                e.preventDefault();
                e.stopPropagation();

                const finalShortcut = formatShortcut(e);

                // 确保至少有一个非修饰键被按下
                if (finalShortcut.length > 0 && finalShortcut !== 'Ctrl' && finalShortcut !== 'Shift' && finalShortcut !== 'Alt' && finalShortcut !== 'Meta') {
                    onChange(finalShortcut); // 最终提交修改
                } else {
                    setTempValue(value); // 如果只按了 Ctrl，恢复原值
                }

                setIsListening(false); // 停止监听
                clearTimeout(timeoutId);
            };

            // 监听 KeyDown 来实时显示, 监听 KeyUp 来确认
            document.addEventListener('keydown', handleKeyDown, true);
            document.addEventListener('keyup', handleKeyUp, true);

            return () => {
                document.removeEventListener('keydown', handleKeyDown, true);
                document.removeEventListener('keyup', handleKeyUp, true);
                clearTimeout(timeoutId);
            };
        }
    }, [isListening, onChange, value]);

    // 处理点击外部取消
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setIsListening(false);
                setTempValue(value); // 恢复原值
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value]);

    return (
        <input
            ref={inputRef}
            type="text"
            className={`keybinding-input ${isListening ? 'is-listening' : ''}`}
            value={isListening ? tempValue : value} // 显示临时值或最终值
            placeholder={isListening ? '请按键...' : ''}
            onFocus={() => {
                setIsListening(true);
                setTempValue(''); // 准备接收新按键
            }}
            readOnly // 始终只读，防止手动输入
        />
    );
}