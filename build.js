const esbuild = require('esbuild');

async function build() {
    try {
        // 任务1: 构建主进程 (保持不变)
        await esbuild.build({
            entryPoints: ['src/main/index.ts', 'src/main/preload.ts'],
            outdir: 'dist/main',
            bundle: true,
            platform: 'node',
            external: ['electron'],
        });
        console.log('✅ Main process built successfully!');

        // 任务2: 构建渲染进程的 JS (移除 CSS 加载器)
        await esbuild.build({
            entryPoints: ['src/renderer/index.tsx'],
            outfile: 'dist/renderer/index.js',
            bundle: true,
            platform: 'browser',
            // 注意：我们从这里移除了 loader: { '.css': 'css' }
        });
        console.log('✅ Renderer JS built successfully!');

        // 任务3: 单独构建并输出 CSS 文件 (新增任务)
        await esbuild.build({
            entryPoints: ['src/renderer/styles.css'],
            outfile: 'dist/renderer/styles.css',
            bundle: true, // bundle: true 可以处理 CSS 中的 @import 语句
        });
        console.log('✅ Renderer CSS built successfully!');

    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();