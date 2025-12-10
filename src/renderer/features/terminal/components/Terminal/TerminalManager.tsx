// src/renderer/features/terminal/components/Terminal/TerminalManager.tsx
import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../../../utils/rpc-client';
import { TerminalInstance } from './TerminalInstance';
import './Terminal.css';

interface TerminalTab {
    id: string;
    title: string;
}

export default function TerminalManager() {
    const [terminals, setTerminals] = useState<TerminalTab[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const initializedRef = useRef(false);

    const handleCreate = async () => {
        try {
            console.log('[Terminal UI] Requesting new terminal...');
            const id = await api.terminal.createTerminal();
            console.log('[Terminal UI] Created terminal:', id);
            setTerminals(prev => [...prev, { id, title: 'Terminal' }]);
            setActiveId(id);
        } catch (err) {
            console.error('[Terminal UI] Failed to create terminal', err);
        }
    };

    const handleClose = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        console.log('[Terminal UI] Closing terminal:', id);

        // 先乐观更新 UI，感觉会快一点
        setTerminals(prev => {
            const newTerms = prev.filter(t => t.id !== id);
            if (id === activeId) {
                setActiveId(newTerms.length > 0 ? newTerms[newTerms.length - 1].id : null);
            }
            return newTerms;
        });

        // 然后通知后端
        try {
            await api.terminal.dispose(id);
            console.log('[Terminal UI] Dispose command sent for:', id);
        } catch (err) {
            console.error('[Terminal UI] Dispose failed:', err);
        }
    };

    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            setTimeout(() => {
                if (terminals.length === 0) {
                    console.log('[Terminal UI] Initial auto-create');
                    handleCreate();
                }
            }, 100);
        }
    }, []);

    return (
        <div className="terminal-panel">
            <div className="terminal-tabs-header">
                {terminals.map(term => (
                    <div
                        key={term.id}
                        className={`terminal-tab ${term.id === activeId ? 'active' : ''}`}
                        onClick={() => setActiveId(term.id)}
                    >
                        <span>{term.title}</span>
                        <div className="close-btn" onClick={(e) => handleClose(e, term.id)}>✕</div>
                    </div>
                ))}
                <div className="terminal-actions">
                    <button className="action-btn" onClick={handleCreate}>+</button>
                </div>
            </div>

            <div className="terminal-content">
                {terminals.map(term => (
                    <TerminalInstance
                        key={term.id}
                        termId={term.id}
                        visible={term.id === activeId}
                        onTitleChange={(t) => {
                            setTerminals(prev => prev.map(item =>
                                item.id === term.id ? { ...item, title: t } : item
                            ));
                        }}
                    />
                ))}
            </div>
        </div>
    );
}