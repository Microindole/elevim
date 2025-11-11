// src/renderer/components/GitPanel/PublishRepoModal.tsx
import React, { useState } from 'react';
import './GitPanel.css'; // 我们复用 GitPanel.css 的样式

interface PublishRepoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (options: { repoName: string, isPrivate: boolean }) => void;
}

export default function PublishRepoModal({ isOpen, onClose, onPublish }: PublishRepoModalProps) {
    const [repoName, setRepoName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = () => {
        if (repoName.trim()) {
            onPublish({ repoName, isPrivate });
            onClose();
        } else {
            alert('请输入仓库名称！'); // 稍后我们会修复这个 alert
        }
    };

    // 使用 .palette-overlay 和 .palette-container 样式
    return (
        <div className="palette-overlay" onClick={onClose}>
            <div className="palette-container" onClick={e => e.stopPropagation()} style={{ width: '500px', maxHeight: 'none', padding: '16px' }}>
                <h3 style={{ margin: 0, marginBottom: '16px' }}>发布到 GitHub</h3>

                <label htmlFor="repo-name" style={{ fontSize: '13px', color: 'var(--text-color-subtle)' }}>仓库名称</label>
                <input
                    type="text"
                    id="repo-name"
                    className="palette-input" // 复用命令面板的输入框样式
                    style={{ marginTop: '4px', marginBottom: '16px' }}
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    autoFocus
                />

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <input
                        type="checkbox"
                        id="is-private"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        style={{ marginRight: '8px' }}
                    />
                    <label htmlFor="is-private" style={{ fontSize: '13px', cursor: 'pointer' }}>
                        创建为私有仓库
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="git-action-btn secondary" onClick={onClose}>
                        取消
                    </button>
                    <button
                        className="git-init-btn" // 复用 "初始化" 按钮样式
                        style={{ width: 'auto', padding: '6px 16px' }}
                        onClick={handleSubmit}
                        disabled={!repoName.trim()}
                    >
                        发布
                    </button>
                </div>
            </div>
        </div>
    );
}