// src/main/cli-handler.ts
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// 1. 定义 CLI 命令返回的“动作”类型
export type CliAction =
    | { type: 'open-window', path: string | null, isFile: boolean } // 启动 GUI 窗口
    | { type: 'print-message', message: string }                   // 打印消息并退出
    | { type: 'quit' };                                            // 安静退出

// 2. 帮助信息
const helpMessage = `
Elevim Editor v${app.getVersion()}

用法: elevim [选项] [路径]

选项:
  -v, --version    打印版本号并退出。
  -h, --help       打印此帮助信息并退出。
  
示例:
  elevim .         在 Elevim 中打开当前目录。
  elevim file.txt  在 Elevim 中打开 'file.txt'。
`;

// 3. 导出的主函数
export function handleCliArguments(argv: string[]): CliAction {
    // 适配开发 (npm run start) 和打包 (elevim.exe)
    const cliArg = argv[process.defaultApp ? 2 : 1];

    if (!cliArg) {
        // 没有参数, 正常启动
        return { type: 'open-window', path: null, isFile: false };
    }

    // 检查不需要启动 GUI 的命令
    switch (cliArg) {
        case '-v':
        case '--version':
            return { type: 'print-message', message: app.getVersion() };

        case '-h':
        case '--help':
            return { type: 'print-message', message: helpMessage };
    }

    // 如果参数不是 -- 开头的, 我们就认为它是一个路径
    if (!cliArg.startsWith('--')) {
        try {
            const resolvedPath = path.resolve(cliArg);
            // 检查路径是否存在
            if (!fs.existsSync(resolvedPath)) {
                return { type: 'print-message', message: `错误: 路径不存在 - ${resolvedPath}` };
            }

            // 检查路径是文件还是目录
            const stat = fs.statSync(resolvedPath);
            if (stat.isFile()) {
                return { type: 'open-window', path: resolvedPath, isFile: true };
            } else {
                return { type: 'open-window', path: resolvedPath, isFile: false };
            }
        } catch (e: any) {
            return { type: 'print-message', message: `路径处理错误: ${e.message}` };
        }
    }

    // 未知命令
    return { type: 'print-message', message: `未知命令: ${cliArg}\n\n${helpMessage}` };
}