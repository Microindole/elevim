```markdown
elevim/
├── dist/                     <-- (编译输出目录，不用管)
├── resources/                <-- (应用打包时需要的图标、资源等)
│   └── icon.png
├── src
├── main/
│   │   ├── lib/                  # 主进程的辅助工具模块
│   │   │   ├── file-system.ts    # 文件系统相关函数 (如读取目录)
│   │   │   └── settings.ts       # 设置读写相关函数
│   │   ├── ipc-handlers.ts       # 专门处理所有 IPC 通信的模块
│   │   ├── index.ts              # 主进程入口 (核心逻辑，更简洁)
│   │   └── preload.ts            # (保持不变)
│   │
│   ├── renderer/
│   │   ├── components/           # 存放所有 React 组件
│   │   │   ├── App/              # App 的专属样式
│   │   │   │   └── App.css
│   │   │   ├── Editor/           # 编辑器组件
│   │   │   │   ├── Editor.tsx
│   │   │   │   └── Editor.css
│   │   │   ├── FileTree/         # 文件树组件 (目录结构不变)
│   │   │   │   ├── FileTree.tsx
│   │   │   │   └── TreeNode.tsx
│   │   │   └── TitleBar/         # 标题栏组件
│   │   │       ├── TitleBar.tsx
│   │   │       └── TitleBar.css
│   │   ├── hooks/                # 自定义 React Hooks
│   │   │   └── useCodeMirror.ts  # 封装 CodeMirror 逻辑
│   │   ├── styles/               # 全局样式
│   │   │   └── global.css
│   │   ├── App.tsx               # 渲染进程入口 (现在是布局和状态中心)
│   │   └── index.tsx             # React 渲染的起点 (不变)
│   │
│   └── shared/                   # (保持不变)
│   ├── constants.ts
│   └── types.ts
│
├── index.html
├── package.json
└── tsconfig.json
```