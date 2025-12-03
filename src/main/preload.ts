// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// 1. 暴露通用的 RPC 接口
contextBridge.exposeInMainWorld('rpc', {
    invoke: (service: string, method: string, ...args: any[]) => {
        return ipcRenderer.invoke('RPC_CALL', { service, method, args });
    },
    onEvent: (callback: (payload: { service: string, event: string, args: any[] }) => void) => {
        const handler = (_: any, payload: any) => callback(payload);
        ipcRenderer.on('RPC_EVENT', handler);
        return () => ipcRenderer.removeListener('RPC_EVENT', handler);
    }
});

// 2. 重写 electronAPI 以适配 RPC
// 我们创建一个辅助函数来简化调用
const call = (service: string, method: string, ...args: any[]) =>
    ipcRenderer.invoke('RPC_CALL', { service, method, args });

// 辅助监听函数：监听 RPC 广播的事件，过滤出特定服务的特定事件
const on = (service: string, eventName: string, callback: Function) => {
    const handler = (_: any, payload: any) => {
        if (payload.service === service && payload.event === eventName) {
            callback(...payload.args);
        }
    };
    ipcRenderer.on('RPC_EVENT', handler);
    return () => ipcRenderer.removeListener('RPC_EVENT', handler);
};

// 3. 映射旧 API 到新 RPC
contextBridge.exposeInMainWorld('electronAPI', {
    file: {
        onFileOpen: (cb: any) => on('file', 'file-opened', cb),
        onNewFile: (cb: any) => on('file', 'new-file', cb), // 注意：这里改为监听 file 服务转发的事件
        saveFile: (path: string, content: string) => call('file', 'saveFile', path, content),
        openFile: (path: string) => call('file', 'openFile', path),
        openFolder: () => call('file', 'openFolder'),
        readDirectory: (path: string) => call('file', 'readDirectory', path),
        showOpenDialog: () => call('file', 'showOpenDialog'),
        globalSearch: (opts: any) => call('file', 'globalSearch', opts),
        globalReplace: (opts: any) => call('file', 'globalReplace', opts),
        readDirectoryFlat: (path: string) => call('file', 'readDirectoryFlat', path),
        readFileContent: (path: string) => call('file', 'readFile', path),
        getGraphData: () => call('file', 'getGraphData'),
        renameFile: (o: string, n: string) => call('file', 'renameFile', o, n),
    },
    git: {
        getGitStatus: (path: string) => call('git', 'getStatus', path), // 注意参数变化，前端可能需要传 path
        // 如果前端没传 path，后端 service 可以尝试使用 cached path，或者我们在前端修改调用
        // 这是一个潜在的不兼容点。建议 GitService 内部维护 currentFolder。
        startGitWatcher: (path: string) => call('git', 'startWatcher', path),
        stopGitWatcher: () => call('git', 'stopWatcher'),
        onGitStatusChange: (cb: any) => on('git', 'status-change', cb),
        gitGetChanges: () => call('git', 'getChanges'), // 这里同样需要 path，暂时假设 Service 记住状态
        gitStageFile: (p: string) => call('git', 'stageFile', null, p), // null 占位 folderPath
        gitUnstageFile: (p: string) => call('git', 'unstageFile', null, p),
        gitDiscardChanges: (p: string) => call('git', 'discardChanges', null, p),
        gitCommit: (msg: string) => call('git', 'commit', null, msg),
        gitGetBranches: () => call('git', 'getBranches', null),
        gitCheckoutBranch: (name: string) => call('git', 'checkoutBranch', null, name),
        gitCreateBranch: (name: string) => call('git', 'createBranch', null, name),
        gitGetCommits: (l: number, s: number) => call('git', 'getCommits', null, l, s),
        gitGetCommitDetails: (hash: string) => call('git', 'getCommitDetails', null, hash),
        gitGetDiff: (path: string, staged: boolean) => call('git', 'getDiff', null, path, staged),
        gitGetCurrentBranch: () => call('git', 'getCurrentBranch', null),
        gitStash: () => call('git', 'stash', null),
        gitStashPop: () => call('git', 'stashPop', null),
        gitCheckoutCommit: (hash: string) => call('git', 'checkoutCommit', null, hash),
        gitCreateBranchFromCommit: (h: string, n: string) => call('git', 'createBranchFromCommit', null, h, n),
        openCommitDiff: (h: string) => call('git', 'getCommitDiff', null, h),
        gitInitRepo: () => call('git', 'initRepo', null),
        gitGetRemotes: () => call('git', 'getRemotes', null),
    },
    terminal: {
        terminalInit: () => call('terminal', 'init'),
        terminalWrite: (data: string) => call('terminal', 'write', data),
        terminalResize: (size: {cols: number, rows: number}) => call('terminal', 'resize', size.cols, size.rows),
        onTerminalData: (cb: any) => on('terminal', 'data', cb),
    },
    settings: {
        getSettings: () => call('settings', 'getSettings'),
        setSetting: (k: string, v: any) => call('settings', 'setSetting', k, v),
        importTheme: () => call('settings', 'importTheme'),
        openSettingsFolder: () => call('settings', 'openSettingsFolder'),
    },
    window: {
        setTitle: (t: string) => call('window', 'setTitle', t),
        minimizeWindow: () => call('window', 'minimize'),
        maximizeWindow: () => call('window', 'maximize'),
        closeWindow: () => call('window', 'close'),
        showSaveDialog: () => call('window', 'showSaveDialog'),
        showMessageBox: (opts: any) => call('window', 'showMessageBox', opts),
        showConfirmBox: (opts: any) => call('window', 'showConfirmBox', opts),
        setFullScreen: (f: boolean) => call('window', 'setFullScreen', f),
    },
    menu: {
        onTriggerSave: (cb: any) => on('menu', 'trigger-save', cb),
        triggerNewFile: () => call('menu', 'triggerNewFile'),
        triggerSaveFile: () => call('menu', 'triggerSaveFile'),
        triggerSaveAsFile: () => call('menu', 'triggerSaveAsFile'),
    },
    github: {
        startAuth: () => call('github', 'startAuth'),
        publishRepo: (opts: any) => call('github', 'publishRepo', null, opts.repoName, opts.isPrivate),
        getTokenStatus: () => call('github', 'getTokenStatus'),
        onPublishSuccess: (cb: any) => on('github', 'publish-success', cb),
        listRepos: () => call('github', 'listRepos'),
        linkRemote: (opts: any) => call('github', 'linkRemote', null, opts.repoUrl),
    },
    session: {
        getSession: () => call('session', 'getSession'),
        saveSession: (s: any) => call('session', 'saveSession', s),
    },
    lsp: {
        start: (lang: string) => call('lsp', 'start', lang),
        send: (lang: string, msg: any) => call('lsp', 'send', lang, msg),
        request: (lang: string, msg: any) => call('lsp', 'request', lang, msg),
        // 特殊：LSP 通知需要处理 (我们现在在 preload 这里拦截原来的 IPC，但现在后端没发 IPC 了)
        // 我们需要监听 RPC 事件 'notification'
        onNotification: (cb: any) => on('lsp', 'notification', cb),
    },
    cli: {
        onOpenFolderFromCli: (cb: any) => on('cli', 'open-folder', cb),
        onOpenFileFromCli: (cb: any) => on('cli', 'open-file', cb),
        onOpenDiffFromCli: (cb: any) => on('cli', 'open-diff', cb),
    }
});