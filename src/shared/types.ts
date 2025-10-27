// src/shared/types.ts
export interface IElectronAPI {
    onFileOpen: (callback: (content: string) => void) => void;
    saveFile: (content: string) => Promise<string | null>;
    onTriggerSave: (callback: () => void) => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}