// src/renderer/hooks/useFileOperations.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OpenFile } from '../components/Tabs/Tabs';
import { EditorGroup } from '../types/layout';

// 默认欢迎页
const welcomeFile: OpenFile = {
    path: null,
    name: "Welcome",
    content: "// Welcome to Elevim!\n// Use Ctrl+\\ to split editor.",
    isDirty: false,
    encoding: 'UTF-8'
};

export function useFileOperations() {
    // --- 核心状态：编辑器组列表 ---
    // 默认初始化一个组
    const [groups, setGroups] = useState<EditorGroup[]>([
        { id: uuidv4(), files: [welcomeFile], activeIndex: 0 }
    ]);

    // --- 当前激活的组 ID ---
    const [activeGroupId, setActiveGroupId] = useState<string>('');

    // 初始化 activeGroupId (确保它总是有值)
    useEffect(() => {
        if (!activeGroupId && groups.length > 0) {
            setActiveGroupId(groups[0].id);
        }
    }, [groups, activeGroupId]);

    // 编辑器光标状态 (简化：暂存全局，理想情况应存入 groups 或 Editor 内部)
    const [cursorLine, setCursorLine] = useState(1);
    const [cursorCol, setCursorCol] = useState(1);
    const programmaticChangeRef = useRef(false);
    const [jumpToLine, setJumpToLine] = useState<{ path: string | null, line: number } | null>(null);

    // --- 辅助计算：当前激活的文件 (用于 TitleBar 显示) ---
    const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
    const activeFile = activeGroup ? activeGroup.files[activeGroup.activeIndex] : null;

    // Ref 用于在异步回调中获取最新状态
    const stateRef = useRef({ groups, activeGroupId });
    useEffect(() => {
        stateRef.current = { groups, activeGroupId };
    }, [groups, activeGroupId]);

    // ================= 操作方法 =================

    // 1. 激活某个组
    const activateGroup = useCallback((groupId: string) => {
        setActiveGroupId(groupId);
    }, []);

    // 2. 打开文件 (总是打开在当前激活的组)
    const openFile = useCallback((
        filePath: string,
        fileContent: string,
        encoding: string,
        line?: number
    ) => {
        setGroups(prevGroups => {
            const currentActiveId = stateRef.current.activeGroupId || prevGroups[0].id;

            return prevGroups.map(group => {
                // 只处理当前激活的组
                if (group.id !== currentActiveId) return group;

                // A. 如果当前显示的是 Welcome 页，直接替换
                if (group.files.length === 1 && group.files[0].name === "Welcome") {
                    const newFile: OpenFile = {
                        path: filePath,
                        name: filePath.split(/[\\/]/).pop() ?? "Untitled",
                        content: fileContent,
                        isDirty: false,
                        encoding
                    };
                    return { ...group, files: [newFile], activeIndex: 0 };
                }

                // B. 检查文件是否已在该组打开
                const existingIndex = group.files.findIndex(f => f.path === filePath);
                if (existingIndex > -1) {
                    // 已存在，切换过去
                    return { ...group, activeIndex: existingIndex };
                }

                // C. 新增文件并激活
                const newFile: OpenFile = {
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

        if (line) {
            setJumpToLine({ path: filePath, line });
        }
    }, []);

    // 3. 新建文件
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

    // 4. 关闭标签页
    const closeTab = useCallback((groupId: string, fileIndex: number) => {
        setGroups(prevGroups => {
            const groupIdx = prevGroups.findIndex(g => g.id === groupId);
            if (groupIdx === -1) return prevGroups;

            const group = prevGroups[groupIdx];
            const newFiles = group.files.filter((_, i) => i !== fileIndex);

            // 情况 A: 组内没有文件了，且这不是最后一个组 -> 删除该组
            if (newFiles.length === 0 && prevGroups.length > 1) {
                const newGroups = prevGroups.filter(g => g.id !== groupId);
                // 如果删除的是当前激活组，将激活权交给前一个组
                if (groupId === stateRef.current.activeGroupId) {
                    const newActiveId = newGroups[Math.max(0, groupIdx - 1)].id;
                    setActiveGroupId(newActiveId);
                }
                return newGroups;
            }

            // 情况 B: 组内没有文件了，但这是最后一个组 -> 显示 Welcome
            if (newFiles.length === 0) {
                return prevGroups.map(g => g.id === groupId
                    ? { ...g, files: [welcomeFile], activeIndex: 0 }
                    : g
                );
            }

            // 情况 C: 正常关闭，调整 activeIndex
            let newActiveIndex = group.activeIndex;
            if (newActiveIndex >= fileIndex && newActiveIndex > 0) {
                newActiveIndex--;
            }

            return prevGroups.map(g => g.id === groupId
                ? { ...g, files: newFiles, activeIndex: newActiveIndex }
                : g
            );
        });
    }, []);

    // 5. 分屏 (Split Editor)
    const splitEditor = useCallback(() => {
        setGroups(prevGroups => {
            const currentActiveId = stateRef.current.activeGroupId;
            const currentGroup = prevGroups.find(g => g.id === currentActiveId);
            if (!currentGroup) return prevGroups;

            // 获取当前正在编辑的文件
            const currentFile = currentGroup.files[currentGroup.activeIndex];

            // 创建新组，并将当前文件复制过去
            const newGroupId = uuidv4();
            const newGroup: EditorGroup = {
                id: newGroupId,
                files: [currentFile], // 复制文件对象
                activeIndex: 0
            };

            // 我们无法在这里直接 setActiveGroupId，因为这是在 setState 回调中
            // 实际上，Allotment 渲染新组后，我们可以通过副作用或用户点击来激活
            // 这里我们简单地将新组添加到列表末尾
            return [...prevGroups, newGroup];
        });
        // 提示：为了体验更好，你可以在 useEffect 中监听 groups 长度变化来自动激活新组
    }, []);

    // 6. 切换组内的 Tab
    const setGroupActiveIndex = useCallback((groupId: string, index: number) => {
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, activeIndex: index } : g));
        // 切换 Tab 时同时也激活该组
        setActiveGroupId(groupId);
    }, []);

    // 7. 内容变更
    const onEditorContentChange = useCallback((doc: string) => {
        if (programmaticChangeRef.current) {
            programmaticChangeRef.current = false;
            return;
        }
        setGroups(prev => {
            const currentActiveId = stateRef.current.activeGroupId;
            return prev.map(group => {
                // 只更新当前激活组的当前文件
                // 注意：如果是分屏，两个组打开同一个文件，这里只更新了激活的那个。
                // 理想情况下应该根据 file.path 更新所有组中的同名文件。
                // 这里为了保持“分屏查看不同状态”的可能性，暂时只更新当前组，
                // 或者你可以遍历所有 group 来同步状态（更像 VS Code）。

                // 下面是同步更新所有组中相同路径文件的逻辑 (VS Code 风格)：
                const activeGroup = prev.find(g => g.id === currentActiveId);
                const activeFilePath = activeGroup?.files[activeGroup?.activeIndex]?.path;

                if (!activeFilePath) {
                    // 如果是 Untitled 文件，只更新当前组
                    if (group.id === currentActiveId) {
                        return {
                            ...group,
                            files: group.files.map((f, i) =>
                                i === group.activeIndex ? { ...f, content: doc, isDirty: true } : f
                            )
                        };
                    }
                    return group;
                }

                // 如果有路径，更新所有组中该路径的文件
                return {
                    ...group,
                    files: group.files.map(f =>
                        f.path === activeFilePath ? { ...f, content: doc, isDirty: true } : f
                    )
                };
            });
        });
    }, []);

    // 8. 保存文件
    const handleSave = useCallback(async () => {
        const { groups, activeGroupId } = stateRef.current;
        const group = groups.find(g => g.id === activeGroupId);
        if (!group) return;
        const file = group.files[group.activeIndex];
        if (!file || file.name === "Welcome") return;

        // 调用 IPC 保存
        const savedPath = await window.electronAPI.file.saveFile(file.content);

        if (savedPath) {
            // 保存成功后，更新所有组中该文件的路径和 dirty 状态
            setGroups(prev => prev.map(g => ({
                ...g,
                files: g.files.map(f => {
                    // 匹配路径或如果是刚保存的 Untitled 文件 (path 为 null)
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

    // 9. 安全动作 (用于关闭窗口等)
    // 简单实现：检查当前激活文件。更完善的实现应该检查所有 dirty 文件。
    const safeAction = useCallback(async (action: () => void) => {
        const { groups, activeGroupId } = stateRef.current;
        const group = groups.find(g => g.id === activeGroupId);
        const file = group?.files[group?.activeIndex];

        if (!file || !file.isDirty || file.name === "Welcome") {
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

    // --- 兼容性导出 ---
    // 为了兼容现有的 App.tsx 和其他 hook，我们需要导出一些兼容的名称
    // 但最好是在 App.tsx 中进行重构。
    // 这里我们提供新的 API。

    return {
        // 新状态
        groups,
        activeGroupId,

        // 兼容旧 API 的导出
        openFiles: activeGroup.files, // 供 Tabs 使用 (如果不重构 Tabs) - 但我们会重构
        activeFile,                   // 供 TitleBar 使用
        activeIndex: activeGroup.activeIndex,

        // 方法
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

        // 其他状态
        cursorLine,
        cursorCol,
        programmaticChangeRef,
        jumpToLine,
        setJumpToLine,

        // 为了兼容 useCliHandlers 等钩子，我们需要提供 setOpenFiles 的替代品
        // 但由于逻辑变了，直接传递 setGroups 给它们可能不合适。
        // 最好的办法是修改 useCliHandlers。
        setGroups,
    };
}