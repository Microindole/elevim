// src/main/cli/cli-handler.ts
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { CliAction } from './cli-action.types';

// --- 帮助信息 ---
// 把它放在一个函数里，这样它总能获取到最新的版本号
function getHelpMessage(): string {
    return `
Elevim 编辑器 (v${app.getVersion()})

一个使用 Electron 和 CodeMirror 构建的轻量级文本编辑器。

用法:
  elevim [命令 | 路径]

命令:
  -v, --version    打印当前版本号并退出。
  -h, --help       打印此帮助信息并退出。
  -d, --diff <file>  启动应用并显示指定文件的 Git 差异。
  
示例:
  elevim             打开应用。
  elevim .           在 Elevim 中打开当前目录。
  elevim file.txt    在 Elevim 中打开 'file.txt'。
`;
}

// --- CLI 参数解析器 ---
export function parseCliArguments(argv: string[]): CliAction {
    // 适配开发 (npm run start) 和打包 (elevim.exe)
    const args = argv.slice(process.defaultApp ? 2 : 1);
    const mainArg = args[0];

    // 1. 没有参数：正常启动
    if (!mainArg) {
        return { type: 'start-gui' };
    }

    // 2. 检查 "快速退出" 命令
    switch (mainArg) {
        case '-v':
        case '--version':
            return { type: 'exit-fast', message: app.getVersion() };

        case '-h':
        case '--help':
            return { type: 'exit-fast', message: getHelpMessage() };
    }

    // 3. 检查 "带参数的" 命令
    // 示例：添加 "elevim -d <file>"
    if (mainArg === '-d' || mainArg === '--diff') {
        const filePath = args[1]; // 获取第二个参数
        if (!filePath) {
            return { type: 'exit-fast', message: '错误: --diff 命令需要一个文件路径。\n\n' + getHelpMessage(), isError: true };
        }
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
            return { type: 'exit-fast', message: `错误: 文件未找到: ${resolvedPath}`, isError: true };
        }
        return { type: 'start-gui-open-diff', filePath: resolvedPath };
    }

    // 4. 检查是否是未知选项
    if (mainArg.startsWith('--')) {
        return { type: 'exit-fast', message: `错误: 未知选项 "${mainArg}"。\n\n` + getHelpMessage(), isError: true };
    }

    // 5. 默认行为：将参数视为路径
    try {
        const resolvedPath = path.resolve(mainArg);
        if (!fs.existsSync(resolvedPath)) {
            return { type: 'exit-fast', message: `错误: 路径未找到: ${resolvedPath}`, isError: true };
        }

        const stat = fs.statSync(resolvedPath);
        if (stat.isFile()) {
            return { type: 'start-gui-open-file', filePath: resolvedPath };
        } else {
            return { type: 'start-gui-open-folder', folderPath: resolvedPath };
        }
    } catch (e: any) {
        return { type: 'exit-fast', message: `路径处理失败: ${e.message}`, isError: true };
    }
}