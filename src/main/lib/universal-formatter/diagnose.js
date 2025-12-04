const { exec } = require('child_process');
const path = require('path');
let clangFormatPath;

try {
    clangFormatPath = require('clang-format');
} catch (e) {
    console.error("❌ 没找到 clang-format 包，请确认 node_modules 存在");
    process.exit(1);
}

// 获取二进制路径
const binPath = typeof clangFormatPath === 'string' 
    ? clangFormatPath 
    : (clangFormatPath.location || 'clang-format');

console.log("---------------------------------------------------");
console.log("🔍 [诊断] 二进制路径:", binPath);

// 模拟输入代码
const code = 'public class test { public static void main(String[] args){System.out.println("Hello");}}';
const args = ['-style=Google', '-assume-filename="test.java"'];

// 构造命令
const command = `"${binPath}" ${args.join(' ')}`;
console.log("🔍 [诊断] 执行命令:", command);
console.log("---------------------------------------------------");

const child = exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
    if (error) {
        console.error("❌ [执行报错]:", error.message);
        console.error("❌ [Stderr]:", stderr);
    } else {
        console.log("✅ [退出代码]: 0 (成功)");
        if (!stdout) {
            console.error("⚠️ [严重问题]: Stdout 是空的！(这就是你遇到的问题)");
            if (stderr) console.log("   但在 Stderr 里发现了这些信息:", stderr);
        } else {
            console.log("✅ [Stdout 输出]:\n", stdout);
        }
    }
});

// 写入数据
try {
    child.stdin.write(code);
    child.stdin.end();
    console.log("info: 数据已写入 stdin");
} catch (e) {
    console.error("❌ 写入 Stdin 失败:", e);
}