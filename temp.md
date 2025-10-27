```markdown
elevim/
├── dist/                     <-- (编译输出目录，不用管)
├── resources/                <-- (应用打包时需要的图标、资源等)
│   └── icon.png
├── src/
│   ├── main/                 <-- 主进程 (Main Process) 的所有代码
│   │   ├── index.ts          <-- 主进程的入口文件 (原来的 main.ts)
│   │   └── preload.ts        <-- Preload 脚本
│   │
│   ├── renderer/             <-- 渲染进程 (Renderer Process) 的所有代码
│   │   ├── index.ts          <-- 渲染进程的入口文件 (原来的 renderer.ts)
│   │   └── components/       <-- (可选) 如果你用 React/Vue, 组件放这里
│   │
│   ├── shared/               <-- 主进程和渲染进程可以共享的代码
│   │   └── constants.ts      <-- (例如: IPC 通信的事件名)
│   │   └── types.ts          <-- (例如: TypeScript 的类型定义)
│   │
│   └── styles/               <-- (可选) 全局 CSS 样式
│       └── main.css
│
├── index.html
├── package.json
└── tsconfig.json
```