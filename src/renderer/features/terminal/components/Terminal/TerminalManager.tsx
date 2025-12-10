// src/renderer/features/terminal/components/Terminal/TerminalManager.tsx
import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../../../utils/rpc-client';
import { TerminalInstance } from './TerminalInstance';
import './Terminal.css';

interface TerminalTab {
    id: string;
    title: string;
}

interface TerminalManagerProps {
    onClose?: () => void;
}

export default function TerminalManager({ onClose }: TerminalManagerProps) {
    const [terminals, setTerminals] = useState<TerminalTab[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const initializedRef = useRef(false);

    // 组件挂载时检查 onClose
    useEffect(() => {
        console.log('[TerminalManager] ✅ Component mounted');
        console.log('[TerminalManager] onClose exists?', !!onClose);

        if (!onClose) {
            console.warn('[TerminalManager] ⚠️ onClose prop is missing! Auto-close will NOT work.');
        }
    }, [onClose]);

    // 格式化标题：只显示程序名
    const formatTitle = (rawTitle: string) => {
        if (!rawTitle) return 'Terminal';
        return rawTitle.replace(/^.*[\\\/]/, '') || 'Terminal';
    };

    const handleCreate = async () => {
        try {
            const id = await api.terminal.createTerminal();
            console.log('[TerminalManager] Created terminal:', id);

            setTerminals(prev => {
                const newTerms = [...prev, { id, title: 'Terminal' }];
                // 如果是唯一的标签，自动激活
                if (newTerms.length === 1) setActiveId(id);
                return newTerms;
            });
            // 确保激活
            setActiveId(id);
        } catch (err) {
            console.error('[TerminalManager] Failed to create terminal', err);
        }
    };

    // [核心修复] 关闭逻辑 - 添加详细日志
    const handleClose = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        console.log('[TerminalManager] ═══════════════════════════════');
        console.log('[TerminalManager] 🗑️  CLOSING TERMINAL');
        console.log('[TerminalManager] Terminal ID:', id);
        console.log('[TerminalManager] Current count:', terminals.length);

        // 1. 立即通知后端销毁
        api.terminal.dispose(id).catch(err => {
            console.error('[TerminalManager] Dispose failed:', err);
        });

        // 2. 基于当前状态计算新状态
        const newTerms = terminals.filter(t => t.id !== id);
        console.log('[TerminalManager] After close count:', newTerms.length);

        // 3. 关键判断：如果删完后没了，直接通知父组件关闭
        if (newTerms.length === 0) {
            console.log('[TerminalManager] 🚪 ALL TABS CLOSED - Triggering panel close');
            setTerminals([]);
            setActiveId(null);

            if (onClose) {
                console.log('[TerminalManager] ✅ Calling onClose callback');
                onClose();
            } else {
                console.error('[TerminalManager] ❌ onClose is NOT defined! Panel will NOT auto-close!');
                console.error('[TerminalManager] Please check MainLayout.tsx line 172');
            }
            console.log('[TerminalManager] ═══════════════════════════════');
            return;
        }

        // 4. 如果还有剩余，且关闭的是当前激活的，切换到最后一个
        if (id === activeId) {
            const lastTerm = newTerms[newTerms.length - 1];
            console.log('[TerminalManager] Switching to:', lastTerm.id);
            setActiveId(lastTerm.id);
        }

        // 5. 更新状态
        setTerminals(newTerms);
        console.log('[TerminalManager] ═══════════════════════════════');
    };

    // 初始化自动创建
    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            console.log('[TerminalManager] Initializing first terminal');
            setTimeout(() => {
                if (terminals.length === 0) {
                    handleCreate();
                }
            }, 100);
        }
    }, []);

    return (
        <div className="terminal-panel">
            {/* 顶部 Tab 栏：VS Code 风格 */}
            <div className="terminal-tabs-header">
                {terminals.map(term => (
                    <div
                        key={term.id}
                        className={`terminal-tab ${term.id === activeId ? 'active' : ''}`}
                        onClick={() => {
                            console.log('[TerminalManager] Switched to:', term.id);
                            setActiveId(term.id);
                        }}
                        title={term.title}
                    >
                        <div className="tab-content">
                            <span className="tab-icon">
                                {/* Terminal 图标 */}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4M20,18H4V8H20V18M12,14H6V12H12V14M18,14H14V12H18V14M6,10H20V6H6V10Z" />
                                </svg>
                            </span>
                            <span className="tab-title">{formatTitle(term.title)}</span>
                            <div
                                className="close-btn"
                                onClick={(e) => handleClose(e, term.id)}
                                title="Close Terminal"
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="terminal-actions">
                    <button
                        className="action-btn"
                        onClick={handleCreate}
                        title="New Terminal (Ctrl+Shift+`)"
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                        </svg>
                    </button>
                    <button
                        className="action-btn"
                        onClick={() => {
                            console.log('[TerminalManager] Close button clicked');
                            if (onClose) {
                                console.log('[TerminalManager] ✅ Calling onClose from button');
                                onClose();
                            } else {
                                console.error('[TerminalManager] ❌ onClose not available!');
                            }
                        }}
                        title="Close Panel"
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                        </svg>
                    </button>
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