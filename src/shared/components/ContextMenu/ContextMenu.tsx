// src/renderer/shared/components/GitPanel/ContextMenu.tsx
import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{ left: x, top: y }}
        >
            {items.map((item, index) => (
                <div
                    key={index}
                    className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${item.danger ? 'danger' : ''}`}
                    onClick={() => {
                        if (!item.disabled) {
                            item.onClick();
                            onClose();
                        }
                    }}
                >
                    {item.label}
                </div>
            ))}
        </div>
    );
}