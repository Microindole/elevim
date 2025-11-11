// build.js
const esbuild = require('esbuild');

async function build() {
    try {
        // 任务1: 构建主进程 (保持不变)
        await esbuild.build({
            entryPoints: ['src/main/index.ts', 'src/main/preload.ts'],
            outdir: 'dist/main',
            bundle: true,
            platform: 'node',
            external: ['electron', 'node-pty', 'keytar'],
        });
        console.log('✅ Main process built successfully!');

        // 任务2: 构建渲染进程的 JS 和 CSS
        await esbuild.build({
            entryPoints: ['src/renderer/index.tsx'],
            outfile: 'dist/renderer/index.js',
            bundle: true,
            platform: 'browser',
            // 核心修复：把 CSS loader 加回来，并指定输出路径
            loader: { '.css': 'css' },
            // esbuild 在打包时，会将 CSS 导入语句提取出来，
            // 并生成一个单独的 CSS 文件。
            // 默认情况下，它会生成一个与 outfile 同名的 .css 文件，
            // 即 'dist/renderer/index.css'。这是我们想要的行为。
        });
        console.log('✅ Renderer JS and CSS built successfully!');

        // 任务3: (已合并到任务2中，不再需要)

    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();

