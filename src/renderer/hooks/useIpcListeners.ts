// src/renderer/hooks/useIpcListeners.ts
import { useEffect } from 'react';

interface UseIpcListenersProps {
    openFile: (filePath: string, fileContent: string) => void;
    handleSave: () => Promise<void>;
    handleNewFile: () => void;
}

export function useIpcListeners({ openFile, handleSave, handleNewFile }: UseIpcListenersProps) {
    useEffect(() => {
        const unregisterFileOpen = window.electronAPI.onFileOpen((data) =>
            openFile(data.filePath, data.content)
        );
        const unregisterTriggerSave = window.electronAPI.onTriggerSave(handleSave);
        const unregisterNewFile = window.electronAPI.onNewFile(handleNewFile);

        return () => {
            unregisterFileOpen();
            unregisterTriggerSave();
            unregisterNewFile();
        };
    }, [openFile, handleSave, handleNewFile]);
}