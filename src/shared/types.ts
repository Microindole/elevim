// src/shared/types.ts

// 扩展全局的 Window 接口
export interface IElectronAPI {
    onFileOpen: (callback: (content: string) => void) => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}