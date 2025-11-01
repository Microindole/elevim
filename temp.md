```markdown
elevim/
├── .github/                  <-- (GitHub 模板配置)
├── dist/                     <-- (编译输出目录，.gitignore 排除)
├── resources/                <-- (应用打包时需要的图标、资源等)
│   └── logo-me.png
├── src/                      <-- (项目源码)
│   ├── main/                 <-- (主进程代码)
│   │   ├── lib/              <-- (主进程的辅助工具模块)
│   │   │   ├── file-system.ts  # 文件系统相关函数 (如读取目录)
│   │   │   ├── git-service.ts  # 封装所有 Git 操作的模块
│   │   │   ├── language-map.ts # CodeMirror 语言高亮映射
│   │   │   └── settings.ts     # 设置读写相关函数
│   │   ├── index.ts          # 主进程入口
│   │   ├── ipc-handlers.ts   # 专门处理所有 IPC 通信的模块
│   │   └── preload.ts        # 预加载脚本，桥接主进程和渲染进程
│   │
│   ├── renderer/             <-- (渲染进程代码 - React 应用)
│   │   ├── components/       <-- (存放所有 React 组件)
│   │   │   ├── App/
│   │   │   │   └── App.css
│   │   │   ├── CommandPalette/ # 命令面板 (Ctrl+Shift+P)
│   │   │   │   ├── CommandPalette.tsx
│   │   │   │   └── CommandPalette.css
│   │   │   ├── Editor/         # CodeMirror 编辑器组件
│   │   │   │   ├── Editor.tsx
│   │   │   │   └── Editor.css
│   │   │   ├── FileTree/       # 文件树组件
│   │   │   │   ├── FileTree.tsx
│   │   │   │   ├── FileTree.css
│   │   │   │   ├── TreeNode.tsx
│   │   │   │   └── icon-map.ts   # 文件/文件夹图标映射
│   │   │   ├── GitPanel/       # Git 源代码管理面板
│   │   │   │   ├── GitPanel.tsx
│   │   │   │   ├── GitPanel.css
│   │   │   │   ├── DiffViewer.tsx  # 差异查看器
│   │   │   │   ├── DiffViewer.css
│   │   │   │   ├── ContextMenu.tsx # 右键菜单
│   │   │   │   └── ContextMenu.css
│   │   │   ├── StatusBar/      # 底部状态栏
│   │   │   │   ├── StatusBar.tsx
│   │   │   │   └── StatusBar.css
│   │   │   ├── Tabs/           # 多标签页
│   │   │   │   ├── Tabs.tsx
│   │   │   │   └── Tabs.css
│   │   │   ├── Terminal/       # 集成终端
│   │   │   │   ├── Terminal.tsx
│   │   │   │   └── Terminal.css
│   │   │   └── TitleBar/       # 自定义标题栏和菜单
│   │   │       ├── TitleBar.tsx
│   │   │       └── TitleBar.css
│   │   ├── hooks/            <-- (自定义 React Hooks)
│   │   │   └── useCodeMirror.ts  # 封装 CodeMirror 逻辑
│   │   ├── styles/           <-- (全局样式)
│   │   │   └── global.css
│   │   ├── App.tsx           # 渲染进程入口 (布局和状态中心)
│   │   ├── index.tsx         # React 渲染的起点
│   │   └── index.css         # CSS 入口文件
│   │
│   └── shared/               <-- (主进程和渲染进程共享的代码)
│       ├── constants.ts      # IPC 频道常量
│       └── types.ts          # 共享的 TypeScript 接口
│
├── .gitignore
├── build.js                  <-- (esbuild 构建脚本)
├── index.html                <-- (Electron 加载的 HTML 根文件)
├── LICENSE
├── package.json
├── package-lock.json
├── README.md
├── SECURITY.md
├── step.md                   <-- (开发步骤)
├── temp.md
└── tsconfig.json
```