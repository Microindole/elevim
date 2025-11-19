// src/renderer/hooks/useFileOperations.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OpenFile } from '../components/Tabs/Tabs';
import { EditorGroup } from '../types/layout';

export function useFileOperations() {
    // 修改：初始化为空列表，不打开默认文件
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
    // 安全获取 activeFile，防止数组越界
    const activeFile = activeGroup && activeGroup.files.length > 0
        ? activeGroup.files[activeGroup.activeIndex]
        : null;

    const stateRef = useRef({ groups, activeGroupId });
    useEffect(() => {
        stateRef.current = { groups, activeGroupId };
    }, [groups, activeGroupId]);

    // --- 操作方法 ---

    const activateGroup = useCallback((groupId: string) => {
        setActiveGroupId(groupId);
    }, []);

    const openFile = useCallback((
        filePath: string,
        fileContent: string,
        encoding: string,
        line?: number
    ) => {
        setGroups(prevGroups => {
            const currentActiveId = stateRef.current.activeGroupId || prevGroups[0].id;

            return prevGroups.map(group => {
                if (group.id !== currentActiveId) return group;

                // 移除旧的 "Welcome" 替换逻辑，现在只需要检查文件是否存在
                const existingIndex = group.files.findIndex(f => f.path === filePath);
                if (existingIndex > -1) {
                    return { ...group, activeIndex: existingIndex };
                }

                const newFile: OpenFile = {
                    path: filePath,
                    name: filePath.split(/[\\/]/).pop() ?? "Untitled",
                    content: fileContent,
                    isDirty: false,
                    encoding
                };

                // 如果之前是空的，activeIndex 设为 0
                const newIndex = group.files.length;

                return {
                    ...group,
                    files: [...group.files, newFile],
                    activeIndex: newIndex
                };
            });
        });

        if (line) {
            setJumpToLine({ path: filePath, line });
        }
    }, []);

    const handleNewFile = useCallback(() => {
        setGroups(prevGroups => {
            const currentActiveId = stateRef.current.activeGroupId || prevGroups[0].id;
            return prevGroups.map(group => {
                if (group.id !== currentActiveId) return group;

                const newFile: OpenFile = {
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

            // 逻辑简化：如果文件关完了，且有多组，则删除组；否则保留空组
            if (newFiles.length === 0 && prevGroups.length > 1) {
                const newGroups = prevGroups.filter(g => g.id !== groupId);
                if (groupId === stateRef.current.activeGroupId) {
                    const newActiveId = newGroups[Math.max(0, groupIdx - 1)].id;
                    setActiveGroupId(newActiveId);
                }
                return newGroups;
            }

            if (newFiles.length === 0) {
                // 变为空组
                return prevGroups.map(g => g.id === groupId
                    ? { ...g, files: [], activeIndex: -1 }
                    : g
                );
            }

            // 调整 activeIndex
            let newActiveIndex = group.activeIndex;
            if (newActiveIndex >= fileIndex) {
                newActiveIndex = Math.max(0, newActiveIndex - 1);
            }
            // 如果关闭的是非激活标签，且在激活标签左侧，索引减一
            // 上面的逻辑可能有点问题，修正如下：
            if (fileIndex < group.activeIndex) {
                // 如果关闭的在当前激活的左边，当前激活的索引减1
                // 这里我们上面已经处理了 activeIndex >= fileIndex 的情况（即关闭当前或左侧）
                // 但如果是关闭当前(==)，我们希望选中前一个，所以 Math.max(0, activeIndex - 1) 是对的
            } else if (fileIndex === group.activeIndex) {
                // 关闭当前，选中前一个，如果前一个不存在(0)，选中后一个(0)
                newActiveIndex = Math.max(0, fileIndex - 1);
                if (newFiles.length > 0 && newActiveIndex >= newFiles.length) {
                    newActiveIndex = newFiles.length - 1;
                }
            } else {
                // 关闭右侧，索引不变
                newActiveIndex = group.activeIndex;
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

    const onEditorContentChange = useCallback((doc: string) => {
        if (programmaticChangeRef.current) {
            programmaticChangeRef.current = false;
            return;
        }
        setGroups(prev => {
            const currentActiveId = stateRef.current.activeGroupId;
            // 同步所有组中相同路径的文件内容
            const currentGroup = prev.find(g => g.id === currentActiveId);
            const currentFile = currentGroup?.files[currentGroup?.activeIndex];
            const activeFilePath = currentFile?.path;

            return prev.map(group => {
                return {
                    ...group,
                    files: group.files.map((f, i) => {
                        // 匹配路径，或者是当前组正在编辑的无名文件
                        const isTarget = (activeFilePath && f.path === activeFilePath) ||
                            (!activeFilePath && group.id === currentActiveId && i === group.activeIndex);

                        if (isTarget && f.content !== doc) {
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
        if (!file) return; // 空组不保存

        const savedPath = await window.electronAPI.file.saveFile(file.content);

        if (savedPath) {
            setGroups(prev => prev.map(g => ({
                ...g,
                files: g.files.map(f => {
                    if (f.path === file.path || (file.path === null && f === file)) {
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
    };
}