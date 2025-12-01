# 架构概览

Elevim 采用经典的 **Electron** 多进程架构，结合 **React** 构建 UI，并使用 **CodeMirror 6** 作为编辑器核心。

## 核心技术栈

* **Runtime**: Electron 30+
* **Frontend**: React 19, TypeScript
* **Editor Core**: CodeMirror 6
* **Terminal**: xterm.js + node-pty
* **Build System**: esbuild + electron-builder

## 进程模型

### 主进程 (Main Process)
位于 `src/main/`。
* 负责应用生命周期管理 (`app`, `BrowserWindow`)。
* 负责原生文件系统操作 (`fs`)。
* 负责 Git 操作的底层执行。
* **IPC 通信**: 注册了 `registerIpcHandlers`，响应渲染进程的请求。

### 渲染进程 (Renderer Process)
位于 `src/renderer/`。
* **Layout**: 使用 `Allotment` 库实现可拖拽的 IDE 布局。
* **UI Components**: 基于 React 组件化开发 (`TitleBar`, `EditorGroup`, `Sidebar`)。
* **State Management**: 使用 React Hooks 和 Context 管理状态。

## 目录结构

```
src/
├── main/              # Electron 主进程代码
│   ├── index.ts       # 入口点
│   └── ipc-handlers/  # IPC 消息处理
├── renderer/          # React 前端代码
│   ├── app/           # 根组件
│   ├── features/      # 功能模块 (editor, git, terminal...)
│   └── layouts/       # 布局组件
└── shared/            # 前后端共用的类型定义和常量
```