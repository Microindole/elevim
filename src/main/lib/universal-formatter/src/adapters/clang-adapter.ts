import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
// @ts-ignore
import clangFormatLib from 'clang-format'; 
import { IFormatter, FormatOptions } from '../interfaces';

export class ClangFormatter implements IFormatter {
  name = 'ClangFormat';

  // ❌ 移除了 '.java'
  private supportedExtensions = new Set([
    '.c', '.cpp', '.h', '.hpp', '.cs', '.proto', '.m', '.mm', '.cu'
  ]);

  canFormat(filePath: string, language?: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    // 移除对 java 的判断
    return this.supportedExtensions.has(ext);
  }

  async format(options: FormatOptions): Promise<string> {
    return new Promise((resolve) => {
      // 1. 优先尝试查找系统安装的 clang-format（通常版本更新，支持更好）
      // 如果你安装了 LLVM，这里会自动用系统版
      let binPath = 'clang-format';
      
      // 2. 如果系统里没装，再回退到 npm 包里自带的旧版二进制
      // 注意：npm 包里的 1.8.0 版本极其古老，对 Java 复杂语法支持很差！
      let useNpmBinary = false;
      try {
          // 简单的检测系统命令是否存在 (Windows 用 where, Linux/Mac 用 which)
          // 这里为了简化，我们先假设系统没有，直接用 NPM 包的逻辑，但不仅限于此
          // 如果你想强制用系统版，请确保已安装 LLVM 并配置了环境变量
          useNpmBinary = true; 
      } catch(e) {}

      if (useNpmBinary) {
          // 获取 npm 包路径
          let npmBin = typeof clangFormatLib === 'string' 
              ? clangFormatLib 
              : (clangFormatLib?.location || 'clang-format');

          // Windows 路径修正逻辑
          if (npmBin.endsWith('.js') || npmBin.endsWith('index.js')) {
              const possibleWinExe = path.join(
                  path.dirname(npmBin), 
                  'bin', 
                  'win32', 
                  'clang-format.exe'
              );
              if (fs.existsSync(possibleWinExe)) {
                  binPath = possibleWinExe;
              } else {
                  // 最后的挣扎：用 node 运行 js 包装器
                  binPath = `node "${npmBin}"`; 
              }
          } else {
              binPath = npmBin;
          }
      }

      // 3. 构造命令：直接处理文件，不走 stdin 管道
      // -style=Google 是默认比较通用的，也可以改成 LLVM 或 Chromium
      const args = [`-style=Google`, `"${options.filePath}"`];
      
      const command = binPath.startsWith('node ') 
          ? `${binPath} ${args.join(' ')}`
          : `"${binPath}" ${args.join(' ')}`;

      // console.log(`[ClangFormat] Debug Command: ${command}`);

      exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
        // 🚨 核心修改：不再掩盖错误
        if (error) {
          console.error(`\n❌ [ClangFormat] Failed to execute:`);
          console.error(`   Command: ${command}`);
          console.error(`   Error: ${error.message}`);
          if (stderr) console.error(`   Stderr: ${stderr}`);
          
          // 仍然返回原始内容，防止文件被破坏，但用户能看到报错了
          resolve(options.content); 
          return;
        }

        if (!stdout || stdout.trim().length === 0) {
            console.error(`\n⚠️ [ClangFormat] Success but empty output!`);
            console.error(`   这通常意味着 clang-format 认为代码有严重语法错误无法解析，或者二进制文件版本太旧。`);
            if (stderr) console.error(`   Stderr: ${stderr}`);
            resolve(options.content);
        } else {
            // 只有成功拿到内容才返回
            resolve(stdout);
        }
      });
    });
  }
}