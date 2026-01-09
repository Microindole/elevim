// build.js
const esbuild = require('esbuild');

async function build() {
    try {
        // 构建主进程 (保持不变)
        await esbuild.build({
            entryPoints: ['src/main/index.ts', 'src/main/preload.ts'],
            outdir: 'dist/main',
            bundle: true,
            platform: 'node',
            external: ['electron', 'node-pty', 'keytar'],
        });
        console.log('✅ Main process built successfully!');

        // 构建渲染进程的 JS 和 CSS
        await esbuild.build({
            entryPoints: ['src/renderer/app/index.tsx'],
            outfile: 'dist/renderer/index.js',
            bundle: true,
            platform: 'browser',
            // 👇 修改这里：添加 .ttf (以及其他字体格式以防万一)
            loader: {
                '.css': 'css',
                '.ttf': 'file',
                '.woff': 'file',
                '.woff2': 'file',
                '.eot': 'file',
                '.svg': 'file'
            },
        });
        console.log('✅ Renderer JS and CSS built successfully!');

    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();