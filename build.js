// build.js
const esbuild = require('esbuild');

async function build() {
    try {
        // 1. 构建主进程
        await esbuild.build({
            entryPoints: ['src/main/index.ts', 'src/main/preload.ts'],
            outdir: 'dist/main',
            bundle: true,
            platform: 'node',
            external: ['electron', 'node-pty', 'keytar'],
        });
        console.log('✅ Main process built successfully!');

        // 2. 构建 Elevim (Code) 渲染进程
        await esbuild.build({
            entryPoints: ['src/renderer/app/index.tsx'],
            outfile: 'dist/renderer/index.js',
            bundle: true,
            platform: 'browser',
            loader: { '.css': 'css' },
        });
        console.log('✅ Elevim (Code) Renderer built successfully!');

        // 3. 构建 Writer (Markdown) 渲染进程
        await esbuild.build({
            entryPoints: ['src/renderer-markdown/index.tsx'],
            outfile: 'dist/renderer-markdown/index.js',
            bundle: true,
            platform: 'browser',
            loader: { '.css': 'css' },
        });
        console.log('✅ Writer (Markdown) Renderer built successfully!');

    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();