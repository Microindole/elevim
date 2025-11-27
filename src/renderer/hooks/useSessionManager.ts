// src/renderer/hooks/useSessionManager.ts
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EditorGroup } from '../types/layout';
import { SidebarView } from '../components/ActivityBar/ActivityBar';

interface UseSessionManagerProps {
    groups: EditorGroup[];
    activeGroupId: string;
    sidebarWidth: number;
    activeSidebarView: SidebarView;
    currentOpenFolderPath: React.MutableRefObject<string | null>;
    // Setters
    setFileTree: (tree: any) => void;
    setGroups: React.Dispatch<React.SetStateAction<EditorGroup[]>>;
    activateGroup: (id: string) => void;
    setSidebarWidth: (width: number) => void;
    setActiveSidebarView: (view: any) => void;
}

export function useSessionManager(props: UseSessionManagerProps) {
    const {
        groups, activeGroupId, sidebarWidth, activeSidebarView, currentOpenFolderPath,
        setFileTree, setGroups, activateGroup, setSidebarWidth, setActiveSidebarView
    } = props;

    const [isReady, setIsReady] = useState(false);

    // --- 启动时恢复 Session ---
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const session = await window.electronAPI.session.getSession();

                // 1. 恢复文件夹和 Git
                if (session.currentFolderPath) {
                    const tree = await window.electronAPI.file.readDirectory(session.currentFolderPath);
                    if (tree) {
                        setFileTree(tree);
                        currentOpenFolderPath.current = session.currentFolderPath;
                        window.electronAPI.git.startGitWatcher(session.currentFolderPath);
                    }
                }

                // 2. 恢复编辑器组和文件
                if (session.groups && session.groups.length > 0) {
                    const restoredGroups = await Promise.all(session.groups.map(async (g: any) => {
                        const files = await Promise.all(g.files.map(async (path: string) => {
                            try {
                                const content = await window.electronAPI.file.openFile(path);
                                if (content === null) return null;
                                return {
                                    id: uuidv4(),
                                    path: path,
                                    name: path.split(/[\\/]/).pop() || 'Untitled',
                                    content: content,
                                    isDirty: false,
                                    encoding: 'UTF-8'
                                };
                            } catch {
                                return null;
                            }
                        }));

                        const validFiles = files.filter((f: any) => f !== null);

                        return {
                            id: g.id,
                            files: validFiles,
                            activeIndex: g.activeFileIndex
                        };
                    }));

                    const validGroups = restoredGroups.filter((g: any) => g.files.length > 0);

                    if (validGroups.length > 0) {
                        setGroups(validGroups);
                        if (session.activeGroupId) {
                            activateGroup(session.activeGroupId);
                        }
                    }
                }

                // 3. 恢复侧边栏状态
                if (session.sidebarWidth) setSidebarWidth(session.sidebarWidth);
                if (session.sidebarView !== undefined) setActiveSidebarView(session.sidebarView);

            } catch (e) {
                console.error('Failed to restore session:', e);
            } finally {
                setIsReady(true);
            }
        };

        restoreSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // --- 自动保存 Session ---
    useEffect(() => {
        if (!isReady) return;

        const timer = setTimeout(() => {
            const sessionData = {
                groups: groups.map(g => ({
                    id: g.id,
                    activeFileIndex: g.activeIndex,
                    files: g.files
                        .filter(f => f.path)
                        .map(f => f.path)
                })),
                activeGroupId,
                sidebarWidth,
                sidebarView: activeSidebarView,
                currentFolderPath: currentOpenFolderPath.current
            };
            window.electronAPI.session.saveSession(sessionData);
        }, 1000);

        return () => clearTimeout(timer);
    }, [groups, activeGroupId, sidebarWidth, activeSidebarView, currentOpenFolderPath, isReady]);

    return { isReady };
}