// src/shared/types.ts

// IElectronAPI 接口保持原样，我们将在 Window 接口中直接定义类型
export interface IElectronAPI {
    onFileOpen: (callback: (data: { content: string; filePath: string }) => void) => () => void;
    saveFile: (content: string) => Promise<string | null>;
    onTriggerSave: (callback: () => void) => () => void;
    setTitle: (title: string) => void;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    showOpenDialog: () => void;
    triggerNewFile: () => void;
    triggerSaveFile: () => void;
    triggerSaveAsFile: () => void;
    onNewFile: (callback: () => void) => () => void;
    showSaveDialog: () => Promise<'save' | 'dont-save' | 'cancel'>;
    openFolder: () => Promise<any | null>;
    openFile: (filePath: string) => Promise<string | null>;
    getSetting: (key: string) => Promise<any>;
    setSetting: (key: string, value: any) => void;
    terminalInit: () => void;
    terminalWrite: (data: string) => void;
    terminalResize: (size: { cols: number, rows: number }) => void;
    onTerminalData: (callback: (data: string) => void) => () => void;
    getGitStatus: () => Promise<Record<string, string>>;
    readDirectory: (folderPath: string) => Promise<any | null>;

    eslintLint: (code: string, filename: string) => Promise<{
        success: boolean;
        diagnostics?: Array<{
            line: number;
            column: number;
            endLine?: number;
            endColumn?: number;
            severity: 'warning' | 'error';
            message: string;
            ruleId: string | null;
        }>;
        error?: string;
    }>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}