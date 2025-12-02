// src/renderer/features/explorer/components/FileTree/RenameModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import './RenameModal.css';

interface RenameModalProps {
    initialName: string;
    onConfirm: (newName: string) => void;
    onClose: () => void;
}

export default function RenameModal({ initialName, onConfirm, onClose }: RenameModalProps) {
    const [name, setName] = useState(initialName);
    const inputRef = useRef<HTMLInputElement>(null);

    // 自动聚焦并全选文件名（不包括扩展名）
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            const lastDotIndex = initialName.lastIndexOf('.');
            if (lastDotIndex > 0) {
                inputRef.current.setSelectionRange(0, lastDotIndex);
            } else {
                inputRef.current.select();
            }
        }
    }, [initialName]);

    const handleSubmit = () => {
        if (name && name.trim() !== '' && name !== initialName) {
            onConfirm(name);
        } else {
            onClose(); // 如果没改名，直接关闭
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="rename-modal-overlay" onMouseDown={onClose}>
            <div className="rename-modal-container" onMouseDown={e => e.stopPropagation()}>
                <div className="rename-modal-header">Rename File</div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                    References to this file (Wiki Links) will be updated automatically.
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className="rename-modal-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <div className="rename-modal-footer">
                    <button className="rename-btn cancel" onClick={onClose}>Cancel</button>
                    <button className="rename-btn confirm" onClick={handleSubmit}>Rename</button>
                </div>
            </div>
        </div>
    );
}