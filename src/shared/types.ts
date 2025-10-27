
export interface IElectronAPI {
    onFileOpen: (callback: (data: { content: string; filePath: string }) => void) => void;
    saveFile: (content: string) => Promise<string | null>;
    onTriggerSave: (callback: () => void) => void;
    setTitle: (title: string) => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}