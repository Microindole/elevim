// build.js
const esbuild = require('esbuild');

async function build() {
    try {
        // 构建主进程
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
            loader: { '.css': 'css' },
        });
        console.log('✅ Renderer JS and CSS built successfully!');

    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();

