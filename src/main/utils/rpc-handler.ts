// src/main/utils/rpc-handler.ts
import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { EventEmitter } from 'events';

// 服务注册表
const services: Record<string, any> = {};

/**
 * 注册一个服务实例
 * @param name 服务名称 (例如 'file', 'git')
 * @param serviceImpl 服务类的实例
 */
export function registerService(name: string, serviceImpl: any) {
    if (services[name]) {
        console.warn(`[RPC] Service '${name}' is already registered. Overwriting.`);
    }
    services[name] = serviceImpl;

    // --- 自动事件桥接 ---
    // 如果服务继承自 EventEmitter，我们监听它的所有事件并广播给前端
    if (serviceImpl instanceof EventEmitter) {
        const originalEmit = serviceImpl.emit;

        // 劫持 emit 方法
        serviceImpl.emit = function (event: string | symbol, ...args: any[]) {
            // 1. 执行原本的 emit，保证后端内部逻辑正常
            const result = originalEmit.apply(this, [event, ...args]);

            // 2. 转发给所有活跃的渲染窗口
            const eventName = String(event);
            BrowserWindow.getAllWindows().forEach(win => {
                if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
                    win.webContents.send('RPC_EVENT', {
                        service: name,
                        event: eventName,
                        args
                    });
                }
            });
            return result;
        } as any;
    }

    // console.log(`[RPC] Service registered: ${name}`);
}

/**
 * 初始化 RPC 监听器 (在 main/index.ts 启动时调用一次)
 */
export function initRpcHandler() {
    // 移除所有旧的 RPC_CALL 监听器，防止热重载时重复注册
    ipcMain.removeHandler('RPC_CALL');

    ipcMain.handle('RPC_CALL', async (event: IpcMainInvokeEvent, payload: { service: string; method: string; args: any[] }) => {
        const { service, method, args } = payload;

        const targetService = services[service];
        if (!targetService) {
            throw new Error(`[RPC] Service '${service}' not found`);
        }

        const targetMethod = targetService[method];
        if (typeof targetMethod !== 'function') {
            throw new Error(`[RPC] Method '${method}' not found on service '${service}'`);
        }

        try {
            // 可选：打印调用日志
            // console.log(`[RPC] Calling ${service}.${method}`);
            return await targetMethod.apply(targetService, args);
        } catch (error: any) {
            console.error(`[RPC] Error in ${service}.${method}:`, error);
            throw error; // 错误会抛回给前端
        }
    });
}