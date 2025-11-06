// src/main/cli/cli-action.types.ts

// 这是 CLI 处理器将返回给 index.ts 的指令
export type CliAction =
// 1. 打印一条消息并立即退出 (用于 -v, -h)
    | { type: 'exit-fast'; message: string; isError?: boolean }

    // 2. 正常启动 GUI 窗口
    | { type: 'start-gui' }

    // 3. 启动 GUI，并立即打开一个文件夹
    | { type: 'start-gui-open-folder'; folderPath: string }

    // 4. 启动 GUI，并立即打开一个文件
    | { type: 'start-gui-open-file'; filePath: string }

    // 5. 启动 GUI，并立即打开 Git Diff
    | { type: 'start-gui-open-diff'; filePath: string };