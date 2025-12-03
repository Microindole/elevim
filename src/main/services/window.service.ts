import { BrowserWindow, dialog, MessageBoxOptions } from 'electron';
import { IWindowService } from '../../shared/api-contract';

export class WindowService implements IWindowService {
    constructor(private mainWindow: BrowserWindow) {}

    async minimize() { this.mainWindow.minimize(); }

    async maximize() {
        if (this.mainWindow.isMaximized()) this.mainWindow.unmaximize();
        else this.mainWindow.maximize();
    }

    async close() { this.mainWindow.close(); }

    async setTitle(title: string) { this.mainWindow.setTitle(title); }

    async setFullScreen(fullscreen: boolean) { this.mainWindow.setFullScreen(fullscreen); }

    async showSaveDialog(): Promise<'save' | 'dont-save' | 'cancel'> {
        const { response } = await dialog.showMessageBox(this.mainWindow, {
            type: 'warning',
            buttons: ['保存', '不保存', '取消'],
            title: '退出前确认',
            message: '文件有未保存的更改，您想保存它们吗？',
            defaultId: 0,
            cancelId: 2
        });
        if (response === 0) return 'save';
        if (response === 1) return 'dont-save';
        return 'cancel';
    }

    async showMessageBox(options: MessageBoxOptions) {
        return await dialog.showMessageBox(this.mainWindow, options);
    }

    async showConfirmBox(options: MessageBoxOptions) {
        const { response } = await dialog.showMessageBox(this.mainWindow, {
            ...options,
            buttons: ['取消', '确定'],
            defaultId: 1,
            cancelId: 0
        });
        return response === 1;
    }
}