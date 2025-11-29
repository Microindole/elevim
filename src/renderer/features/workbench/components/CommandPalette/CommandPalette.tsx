// src/renderer/features/workbench/components/CommandPalette/CommandPalette.tsx
import React, { useState, useEffect, useRef } from 'react';
import './CommandPalette.css';

export interface Command {
    id: string;
    name: string;
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    commands: Command[];
}

export default function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredCommands = commands.filter(cmd =>
        cmd.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 当面板打开时，自动聚焦到输入框
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        } else {
            // 关闭时重置状态
            setSearchTerm('');
            setActiveIndex(0);
        }
    }, [isOpen]);

    // 处理键盘导航
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[activeIndex]) {
                    filteredCommands[activeIndex].action();
                    onClose();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeIndex, filteredCommands, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="palette-overlay" onClick={onClose}>
            <div className="palette-container" onClick={e => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search commands..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="palette-input"
                />
                <ul className="palette-list">
                    {filteredCommands.map((cmd, index) => (
                        <li
                            key={cmd.id}
                            className={`palette-item ${index === activeIndex ? 'active' : ''}`}
                            onClick={() => {
                                cmd.action();
                                onClose();
                            }}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            {cmd.name}
                        </li>
                    ))}
                    {filteredCommands.length === 0 && (
                        <li className="palette-item-empty">No commands found</li>
                    )}
                </ul>
            </div>
        </div>
    );
}