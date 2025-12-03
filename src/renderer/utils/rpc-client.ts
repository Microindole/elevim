// src/renderer/utils/rpc-client.ts
import type { AppApi } from '../../shared/api-contract';

// 全局事件监听器映射表
// Key: "serviceName:eventName" -> Value: Set<Callback>
const eventListeners = new Map<string, Set<Function>>();

let isInitialized = false;

/**
 * 初始化 RPC 客户端监听 (在 App.tsx 或 index.tsx 调用一次)
 */
export function initRpcClient() {
    if (isInitialized) return;

    // @ts-ignore
    window.rpc.onEvent(({ service, event, args }) => {
        const key = `${service}:${event}`;
        const listeners = eventListeners.get(key);
        if (listeners) {
            listeners.forEach(fn => fn(...args));
        }
    });

    isInitialized = true;
    console.log('[RPC Client] Initialized');
}

/**
 * 生成 API 代理对象
 */
export const api = new Proxy({} as AppApi, {
    get: (_target, serviceName: string) => {
        return new Proxy({}, {
            get: (_serviceTarget, methodName: string) => {

                // 特殊处理 .on() 方法，用于事件监听
                if (methodName === 'on') {
                    return (eventName: string, callback: Function) => {
                        const key = `${serviceName}:${eventName}`;
                        if (!eventListeners.has(key)) {
                            eventListeners.set(key, new Set());
                        }
                        eventListeners.get(key)!.add(callback);

                        // 返回 unsubscribe 函数 (React useEffect 友好)
                        return () => {
                            const set = eventListeners.get(key);
                            if (set) set.delete(callback);
                        };
                    };
                }

                // 默认行为：发起 RPC 调用
                return async (...args: any[]) => {
                    // @ts-ignore
                    return await window.rpc.invoke(serviceName, methodName, ...args);
                };
            }
        });
    }
});