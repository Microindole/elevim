// src/renderer/components/GitPanel/PublishRepoModal.tsx
import React, { useState, useEffect } from 'react';
import './GitPanel.css';
import './PublishRepoModal.css';

interface Repo {
    name: string;
    url: string;
    private: boolean;
}

interface PublishRepoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PublishRepoModal({ isOpen, onClose }: PublishRepoModalProps) {
    const [view, setView] = useState<'create' | 'link'>('create');
    const [isLoading, setIsLoading] = useState(false);
    const [repoList, setRepoList] = useState<Repo[]>([]);
    const [filter, setFilter] = useState('');

    // 'Create' 视图的状态
    const [newRepoName, setNewRepoName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);

    // 'Link' 视图的状态
    const [selectedRepoUrl, setSelectedRepoUrl] = useState<string>('');

    const [error, setError] = useState<string | null>(null);

    // 当模态框打开时，获取仓库列表
    useEffect(() => {
        if (isOpen) {
            // 重置状态
            setIsLoading(true);
            setError(null);
            setView('create');
            setNewRepoName('');
            setSelectedRepoUrl('');

            // 尝试获取 token 状态和仓库列表
            window.electronAPI.github.getTokenStatus().then(loggedIn => {
                if (loggedIn) {
                    window.electronAPI.github.listRepos()
                        .then(repos => {
                            setRepoList(repos);
                            if (repos.length > 0) {
                                // 默认选中第一个
                                setSelectedRepoUrl(repos[0].url);
                            }
                        })
                        .catch(err => setError(err.message))
                        .finally(() => setIsLoading(false));
                } else {
                    // 如果没登录，就不去获取列表了
                    setIsLoading(false);
                    // 停留在 'create' 视图，用户点击发布时会自动触发登录
                }
            });
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);

        try {
            let result: { success: boolean, error: string | null };

            if (view === 'create') {
                if (!newRepoName.trim()) {
                    throw new Error('请输入仓库名称');
                }
                // 调用"创建并发布"
                result = await window.electronAPI.github.publishRepo({
                    repoName: newRepoName,
                    isPrivate: isPrivate
                });

            } else { // view === 'link'
                if (!selectedRepoUrl) {
                    throw new Error('请选择一个要关联的仓库');
                }
                // 调用"关联并发布"
                result = await window.electronAPI.github.linkRemote({
                    repoUrl: selectedRepoUrl
                });
            }

            if (result.success) {
                // 成功！GitPanel 中的 onPublishSuccess 监听器会自动刷新
                onClose();
            } else {
                throw new Error(result.error || '发生未知错误');
            }

        } catch (e: any) {
            console.error('[PublishModal] Handle submit error:', e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredRepos = repoList.filter(repo =>
        repo.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (!isOpen) {
        return null;
    }

    // 复用 .palette-overlay 和 .palette-container 样式
    return (
        <div className="palette-overlay" onClick={onClose}>
            <div
                className="palette-container"
                onClick={e => e.stopPropagation()}
                style={{ width: '500px', maxHeight: '70vh', padding: '0', display: 'flex', flexDirection: 'column' }}
            >
                {/* 1. 模态框 Header */}
                <h3 style={{
                    margin: 0,
                    padding: '24px 32px 20px',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#fff',
                    borderBottom: '1px solid #2a2a2a',
                    background: 'linear-gradient(180deg, #1f1f1f 0%, #1a1a1a 100%)',
                    letterSpacing: '-0.01em'
                }}>
                    发布到 GitHub
                </h3>

                {/* 2. 切换视图的 Tabs */}
                <div className="publish-modal-tabs">
                    <button
                        className={`publish-modal-tab ${view === 'create' ? 'active' : ''}`}
                        onClick={() => setView('create')}
                    >
                        创建新仓库
                    </button>
                    <button
                        className={`publish-modal-tab ${view === 'link' ? 'active' : ''}`}
                        onClick={() => setView('link')}
                        disabled={repoList.length === 0}
                        title={repoList.length === 0 ? (isLoading ? "正在加载..." : "未找到可用的仓库") : "关联已有仓库"}
                    >
                        关联已有仓库
                    </button>
                </div>

                {/* 3. 内容区域 */}
                <div className="publish-modal-content">
                    {/* "创建" 视图 */}
                    {view === 'create' && (
                        <>
                            <label htmlFor="repo-name">仓库名称</label>
                            <input
                                type="text"
                                id="repo-name"
                                className="palette-input" // 复用输入框样式
                                value={newRepoName}
                                onChange={(e) => setNewRepoName(e.target.value)}
                                placeholder="例如: my-new-project"
                                autoFocus
                                disabled={isLoading}
                            />

                            <div className="publish-modal-checkbox">
                                <input
                                    type="checkbox"
                                    id="is-private"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                    disabled={isLoading}
                                />
                                <label htmlFor="is-private">
                                    创建为私有仓库
                                </label>
                            </div>
                        </>
                    )}

                    {/* "关联" 视图 */}
                    {view === 'link' && (
                        <>
                            <label htmlFor="repo-link-filter">搜索您的远程仓库</label>
                            <input
                                type="text"
                                id="repo-link-filter"
                                className="palette-input"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                placeholder="搜索..."
                                autoFocus
                                disabled={isLoading}
                            />

                            <label htmlFor="repo-link-select" style={{marginTop: '12px'}}>选择一个仓库</label>
                            <select
                                id="repo-link-select"
                                className="palette-input" // 复用样式，但 select 可能需要单独调整
                                value={selectedRepoUrl}
                                onChange={(e) => setSelectedRepoUrl(e.target.value)}
                                disabled={isLoading || filteredRepos.length === 0}
                                size={5} // 显示为列表框
                                style={{height: '150px', padding: '0'}}
                            >
                                {isLoading && <option disabled>正在加载...</option>}
                                {!isLoading && filteredRepos.length === 0 && (
                                    <option disabled>{filter ? "未找到匹配仓库" : "没有可用的仓库"}</option>
                                )}
                                {filteredRepos.map(repo => (
                                    <option key={repo.url} value={repo.url} style={{padding: '8px 10px'}}>
                                        {repo.name} {repo.private ? '(Private)' : ''}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                </div>

                {/* 4. 底部操作栏 */}
                <div className="publish-modal-footer">
                    {error && <span className="publish-modal-error">{error}</span>}
                    <button
                        className="git-action-btn secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        取消
                    </button>
                    <button
                        className="git-init-btn" // 复用 "初始化" 按钮样式
                        style={{ width: 'auto', padding: '6px 16px' }}
                        onClick={handleSubmit}
                        disabled={isLoading || (view === 'create' && !newRepoName.trim()) || (view === 'link' && !selectedRepoUrl)}
                    >
                        {isLoading ? '发布中...' : '发布'}
                    </button>
                </div>
            </div>
        </div>
    );
}