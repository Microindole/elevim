
export interface IElectronAPI {
    onFileOpen: (callback: (data: { content: string; filePath: string }) => void) => void;
    saveFile: (content: string) => Promise<string | null>;
    onTriggerSave: (callback: () => void) => void;
    setTitle: (title: string) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    showOpenDialog: () => void;
    triggerNewFile: () => void;
    triggerSaveFile: () => void;
    triggerSaveAsFile: () => void;
    onNewFile: (callback: () => void) => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}