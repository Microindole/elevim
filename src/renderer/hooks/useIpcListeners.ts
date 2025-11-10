// src/renderer/hooks/useIpcListeners.ts
import { useEffect } from 'react';

interface UseIpcListenersProps {
    openFile: (filePath: string, fileContent: string) => void;
    handleSave: () => Promise<void>;
    handleNewFile: () => void;
}

export function useIpcListeners({ openFile, handleSave, handleNewFile }: UseIpcListenersProps) {
    useEffect(() => {
        const unregisterFileOpen = window.electronAPI.file.onFileOpen((data) => // MODIFIED
            openFile(data.filePath, data.content)
        );
        const unregisterTriggerSave = window.electronAPI.menu.onTriggerSave(handleSave); // MODIFIED
        const unregisterNewFile = window.electronAPI.file.onNewFile(handleNewFile); // MODIFIED

        return () => {
            unregisterFileOpen();
            unregisterTriggerSave();
            unregisterNewFile();
        };
    }, [openFile, handleSave, handleNewFile]);
}