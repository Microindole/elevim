// src/renderer/features/editor/hooks/useFileOperations.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OpenFile } from '../components/Tabs/Tabs';
import { EditorGroup } from '../../../types/layout';

const welcomeFile: OpenFile = {
    id: 'welcome',
    path: null,
    name: "Welcome",
    content: "// Welcome to Elevim!\n// Use Ctrl+\\ to split editor.",
    isDirty: false,
    encoding: 'UTF-8'
};

// 路径标准化
const normalizePath = (path: string | null) => {
    if (!path) return '';
    // 1. 统一将反斜杠替换为正斜杠
    // 2. 转为小写（解决 Windows 盘符大小写不一致问题）
    return path.replace(/\\/g, '/').toLowerCase();
};

export function useFileOperations() {
    const [groups, setGroups] = useState<EditorGroup[]>([
        { id: uuidv4(), files: [], activeIndex: -1 }
    ]);

    const [activeGroupId, setActiveGroupId] = useState<string>('');

    useEffect(() => {
        if (!activeGroupId && groups.length > 0) {
            setActiveGroupId(groups[0].id);
        }
    }, [groups, activeGroupId]);

    const [cursorLine, setCursorLine] = useState(1);
    const [cursorCol, setCursorCol] = useState(1);
    const programmaticChangeRef = useRef(false);
    const [jumpToLine, setJumpToLine] = useState<{ path: string | null, line: number } | null>(null);

    const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
    const activeFile = activeGroup && activeGroup.files.length > 0
        ? activeGroup.files[activeGroup.activeIndex]
        : null;

    const stateRef = useRef({ groups, activeGroupId });
    useEffect(() => {
        stateRef.current = { groups, activeGroupId };
    }, [groups, activeGroupId]);

    const activateGroup = useCallback((groupId: string) => {
        setActiveGroupId(groupId);
    }, []);

    const openFile = useCallback((
        filePath: string,
        fileContent: string,
        encoding: string,
        line?: number
    ) => {
        // 用于跳转的最终路径（默认为传入路径）
        let finalJumpPath = filePath;

        const { groups, activeGroupId } = stateRef.current;
        const currentActiveId = activeGroupId || groups[0]?.id;
        const currentGroup = groups.find(g => g.id === currentActiveId);

        if (currentGroup) {
            const targetPath = normalizePath(filePath);
            const existingFile = currentGroup.files.find(f => normalizePath(f.path) === targetPath);
            if (existingFile && existingFile.path) {
                finalJumpPath = existingFile.path; // 使用已存在的路径格式
            }
        }

        setGroups(prevGroups => {
            const currentActiveId = stateRef.current.activeGroupId || prevGroups[0].id;

            return prevGroups.map(group => {
                if (group.id !== currentActiveId) return group;

                // 如果是 Welcome 页，替换它
                if (group.files.length === 1 && group.files[0].name === "Welcome") {
                    const newFile: OpenFile = {
                        id: uuidv4(),
                        path: filePath,
                        name: filePath.split(/[\\/]/).pop() ?? "Untitled",
                        content: fileContent,
                        isDirty: false,
                        encoding
                    };
                    return { ...group, files: [newFile], activeIndex: 0 };
                }

                // B. 使用标准化路径检查文件是否已存在
                const targetPath = normalizePath(filePath);
                const existingIndex = group.files.findIndex(f => normalizePath(f.path) === targetPath);

                if (existingIndex > -1) {
                    // 如果已存在，直接激活该 Tab
                    return { ...group, activeIndex: existingIndex };
                }

                // 新增文件
                const newFile: OpenFile = {
                    id: uuidv4(),
                    path: filePath,
                    name: filePath.split(/[\\/]/).pop() ?? "Untitled",
                    content: fileContent,
                    isDirty: false,
                    encoding
                };
                return {
                    ...group,
                    files: [...group.files, newFile],
                    activeIndex: group.files.length
                };
            });
        });

        if (line) setJumpToLine({ path: finalJumpPath, line });
    }, []);

    const handleNewFile = useCallback(() => {
        setGroups(prevGroups => {
            const currentActiveId = stateRef.current.activeGroupId || prevGroups[0].id;
            return prevGroups.map(group => {
                if (group.id !== currentActiveId) return group;

                const newFile: OpenFile = {
                    id: uuidv4(),
                    path: null,
                    name: "Untitled",
                    content: "",
                    isDirty: false,
                    encoding: 'UTF-8'
                };
                return {
                    ...group,
                    files: [...group.files, newFile],
                    activeIndex: group.files.length
                };
            });
        });
    }, []);

    const closeTab = useCallback((groupId: string, fileIndex: number) => {
        setGroups(prevGroups => {
            const groupIdx = prevGroups.findIndex(g => g.id === groupId);
            if (groupIdx === -1) return prevGroups;

            const group = prevGroups[groupIdx];
            const newFiles = group.files.filter((_, i) => i !== fileIndex);

            if (newFiles.length === 0 && prevGroups.length > 1) {
                const newGroups = prevGroups.filter(g => g.id !== groupId);
                if (groupId === stateRef.current.activeGroupId) {
                    const newActiveId = newGroups[Math.max(0, groupIdx - 1)].id;
                    setActiveGroupId(newActiveId);
                }
                return newGroups;
            }

            if (newFiles.length === 0) {
                return prevGroups.map(g => g.id === groupId
                    ? { ...g, files: [], activeIndex: -1 }
                    : g
                );
            }

            let newActiveIndex = group.activeIndex;
            if (fileIndex < group.activeIndex) {
                newActiveIndex = Math.max(0, newActiveIndex - 1);
            } else if (fileIndex === group.activeIndex) {
                newActiveIndex = Math.max(0, fileIndex - 1);
                if (newFiles.length > 0 && newActiveIndex >= newFiles.length) {
                    newActiveIndex = newFiles.length - 1;
                }
            }

            return prevGroups.map(g => g.id === groupId
                ? { ...g, files: newFiles, activeIndex: newActiveIndex }
                : g
            );
        });
    }, []);

    const splitEditor = useCallback(() => {
        setGroups(prevGroups => {
            const currentActiveId = stateRef.current.activeGroupId;
            const currentGroup = prevGroups.find(g => g.id === currentActiveId);
            if (!currentGroup || currentGroup.files.length === 0) return prevGroups;

            const currentFile = currentGroup.files[currentGroup.activeIndex];

            const newGroupId = uuidv4();
            const newGroup: EditorGroup = {
                id: newGroupId,
                files: [currentFile],
                activeIndex: 0
            };
            return [...prevGroups, newGroup];
        });
    }, []);

    const setGroupActiveIndex = useCallback((groupId: string, index: number) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, activeIndex: index } : g));
        setActiveGroupId(groupId);
    }, []);

    // [修复核心]：增加 fileId 参数，确保只更新特定的文件
    const onEditorContentChange = useCallback((doc: string, fileId: string) => {
        if (programmaticChangeRef.current) {
            programmaticChangeRef.current = false;
            return;
        }
        setGroups(prev => {
            // 1. 先找到触发变更的那个文件的 Path (为了处理分屏同步)
            let sourcePath: string | null = null;
            for (const group of prev) {
                const f = group.files.find(f => f.id === fileId);
                if (f && f.path) {
                    sourcePath = normalizePath(f.path);
                    break;
                }
            }

            // 2. 遍历所有组，精确更新匹配的文件
            return prev.map(group => {
                return {
                    ...group,
                    files: group.files.map(f => {
                        // 匹配条件：ID 相同 (同一个标签页) OR 路径相同 (分屏的同一个文件)
                        const isTarget = f.id === fileId;
                        const isSyncedPath = sourcePath && f.path && normalizePath(f.path) === sourcePath;

                        if ((isTarget || isSyncedPath) && f.content !== doc) {
                            return { ...f, content: doc, isDirty: true };
                        }
                        return f;
                    })
                };
            });
        });
    }, []);

    const handleSave = useCallback(async () => {
        const { groups, activeGroupId } = stateRef.current;
        const group = groups.find(g => g.id === activeGroupId);
        if (!group) return;
        const file = group.files[group.activeIndex];
        if (!file) return;

        const savedPath = await window.electronAPI.file.saveFile(file.path, file.content);
        if (savedPath) {
            setGroups(prev => prev.map(g => ({
                ...g,
                files: g.files.map(f => {
                    if ((f.path && normalizePath(f.path) === normalizePath(file.path)) || (file.path === null && f === file)) {
                        return {
                            ...f,
                            path: savedPath,
                            name: savedPath.split(/[\\/]/).pop()!,
                            isDirty: false
                        };
                    }
                    return f;
                })
            })));
            window.dispatchEvent(new Event('folder-changed'));
        }
    }, []);

    const safeAction = useCallback(async (action: () => void) => {
        const { groups, activeGroupId } = stateRef.current;
        const group = groups.find(g => g.id === activeGroupId);
        const file = group?.files[group?.activeIndex];

        if (!file || !file.isDirty) {
            action();
            return;
        }

        const choice = await window.electronAPI.window.showSaveDialog();
        if (choice === 'save') {
            await handleSave();
            action();
        } else if (choice === 'dont-save') {
            action();
        }
    }, [handleSave]);

    const handleCursorChange = useCallback((line: number, col: number) => {
        setCursorLine(line);
        setCursorCol(col);
    }, []);

    // 切换到下一个标签页
    const nextEditor = useCallback(() => {
        setGroups(prevGroups => {
            const currentActiveId = stateRef.current.activeGroupId;
            return prevGroups.map(g => {
                if (g.id === currentActiveId && g.files.length > 1) {
                    const nextIndex = (g.activeIndex + 1) % g.files.length; // 循环切换
                    return { ...g, activeIndex: nextIndex };
                }
                return g;
            });
        });
    }, []);

    // 切换到上一个标签页
    const previousEditor = useCallback(() => {
        setGroups(prevGroups => {
            const currentActiveId = stateRef.current.activeGroupId;
            return prevGroups.map(g => {
                if (g.id === currentActiveId && g.files.length > 1) {
                    // 循环切换逻辑
                    const prevIndex = (g.activeIndex - 1 + g.files.length) % g.files.length;
                    return { ...g, activeIndex: prevIndex };
                }
                return g;
            });
        });
    }, []);

    return {
        groups,
        activeGroupId,
        activeFile,
        activeIndex: activeGroup?.activeIndex ?? -1,
        cursorLine,
        cursorCol,
        programmaticChangeRef,
        jumpToLine,
        setJumpToLine,
        setGroups,
        activateGroup,
        openFile,
        handleSave,
        handleNewFile,
        closeTab,
        splitEditor,
        setGroupActiveIndex,
        onEditorContentChange,
        handleCursorChange,
        safeAction,
        nextEditor,
        previousEditor,
    };
}