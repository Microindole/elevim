// src/renderer/hooks/useIpcListeners.ts
import { useEffect } from 'react';

interface UseIpcListenersProps {
    openFile: (filePath: string, fileContent: string, encoding: string) => void;
    handleSave: () => Promise<void>;
    handleNewFile: () => void;
}

export function useIpcListeners({ openFile, handleSave, handleNewFile }: UseIpcListenersProps) {
    useEffect(() => {
        const unregisterFileOpen = window.electronAPI.file.onFileOpen((data) =>
            openFile(data.filePath, data.content, data.encoding)
        );
        const unregisterTriggerSave = window.electronAPI.menu.onTriggerSave(handleSave);
        const unregisterNewFile = window.electronAPI.file.onNewFile(handleNewFile);

        return () => {
            unregisterFileOpen();
            unregisterTriggerSave();
            unregisterNewFile();
        };
    }, [openFile, handleSave, handleNewFile]);
}