# Elevim Editor

一个使用 Electron、React (TypeScript) 和 CodeMirror 6 构建的轻量级文本编辑器。

## ✨ 功能特性

* **现代编辑器核心**：基于 CodeMirror 6，提供流畅的编辑体验和动态语法高亮。
* **多标签页**：支持同时打开和编辑多个文件。
* **文件树**：清晰展示项目目录结构，并集成 Git 状态高亮。
* **集成终端**：内置 `xterm.js` 和 `node-pty` 驱动的真实终端。
* **命令面板**：通过 `Ctrl+Shift+P` 快速访问核心功能（如保存、新建文件等）。
* **状态栏**：实时显示光标位置信息。

## 🚀 快速开始 (本地开发)

1.  克隆仓库：
    ```bash
    git clone https://github.com/Microindole/elevim.git
    cd elevim
    ```

2.  安装依赖：
    ```bash
    npm install
    ```

3.  运行应用（开发模式）：
    ```bash
    npm run start
    ```

## 🛠️ 构建与打包

* **构建** (仅编译代码到 `dist` 目录)：
    ```bash
    npm run build
    ```

* **打包** (生成可分发的安装包到 `release` 目录)：
    ```bash
    npm run dist
    ```

## 🤝 贡献

欢迎提交 Pull Requests！有关详细信息，请参阅 [贡献指南](.github/CONTRIBUTING.md)。

## 📄 许可证

本项目基于 [木兰宽松许可证，第2版 (Mulan PSL v2)](LICENSE) 分发。


