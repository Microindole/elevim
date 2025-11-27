// src/renderer/hooks/useGlobalEvents.ts
import { useEffect } from 'react';
import { AppSettings } from '../../shared/types';

interface UseGlobalEventsProps {
    setSettings: React.Dispatch<React.SetStateAction<AppSettings | null>>;
    handleFileTreeSelectWrapper: (path: string) => void;
    setJumpToLine: (location: { path: string; line: number }) => void;
}

export function useGlobalEvents({ setSettings, handleFileTreeSelectWrapper, setJumpToLine }: UseGlobalEventsProps) {

    // 监听设置变更
    useEffect(() => {
        const fetchSettings = async () => {
            const loadedSettings = await window.electronAPI.settings.getSettings();
            setSettings(loadedSettings);
        };
        fetchSettings();

        const handleSettingsChange = (event: Event) => {
            const { key, value } = (event as CustomEvent).detail;
            setSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
        };
        window.addEventListener('settings-changed', handleSettingsChange);
        return () => {
            window.removeEventListener('settings-changed', handleSettingsChange);
        };
    }, [setSettings]);

    // 监听 LSP 跳转请求
    useEffect(() => {
        const handleJumpRequest = (e: any) => {
            const { path, line } = e.detail;
            // 1. 打开文件 (复用 FileTree 的打开逻辑)
            handleFileTreeSelectWrapper(path);

            // 2. 设置跳转 (延迟一小段时间等待文件加载和 Editor 组件挂载)
            setTimeout(() => {
                setJumpToLine({ path, line });
            }, 150);
        };

        window.addEventListener('open-file-request', handleJumpRequest);
        return () => window.removeEventListener('open-file-request', handleJumpRequest);
    }, [handleFileTreeSelectWrapper, setJumpToLine]);
}