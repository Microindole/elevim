### 阶段四：完善核心编辑体验

*这个阶段的目标是让你从“能用”变成“好用”，加入现代编辑器的标配功能。*

#### 1. 实现标签页 (Tabs) 以支持多文件编辑

*   **目标**：像 VS Code 一样，在窗口顶部显示多个标签页，允许用户在不同文件间快速切换。
*   **思路**：
    1.  **状态管理**：在 `App.tsx` 中，用一个数组 state 来管理所有打开的文件，例如 `const [openFiles, setOpenFiles] = useState([{path: string, content: string, isDirty: boolean}, ...])`。同时，需要一个 state 记录当前激活的是哪个标签页，例如 `const [activeIndex, setActiveIndex] = useState(0)`。
    2.  **UI 组件**：创建一个新的 `Tabs.tsx` 组件，负责渲染 `openFiles` 数组为标签页 UI。每个标签页都应该可以点击切换、显示未保存状态（`*`）、以及关闭。
    3.  **逻辑变更**：
        *   当用户从文件树点击文件时，不再是直接替换当前编辑器的内容，而是检查该文件是否已在 `openFiles` 中。如果是，则切换到那个标签页；如果否，则读取文件内容，将其添加到 `openFiles` 数组中，并设为当前激活标签。
        *   `Editor` 组件现在接收的内容 `content` 应该来自 `openFiles[activeIndex].content`。
        *   保存 (`handleSave`) 时，保存的也是当前激活文件的内容。

#### 2. 实现状态栏 (Status Bar)

*   **目标**：在编辑器底部添加一个状态栏，显示光标位置、文件编码、行尾序列等信息。
*   **思路**：
    1.  **UI 组件**：创建一个 `StatusBar.tsx` 组件。
    2.  **获取信息**：CodeMirror 的 `EditorState` 包含了丰富的信息。你可以通过 `EditorView.updateListener` 监听光标移动 (`update.selectionSet`)，然后从 `view.state.selection.main.head` 获取光标位置，计算出当前行号和列号。
    3.  **数据传递**：在 `Editor` 组件中获取这些信息，通过回调函数传递给 `App.tsx`，再由 `App.tsx` 传递给 `StatusBar` 组件来显示。

#### 3. 增强的语法高亮

*   **目标**：不仅仅是支持默认语言，而是能根据文件后缀名动态加载对应的语法高亮。
*   **思路**：
    1.  **安装语言包**：从 `@codemirror/language` 或相关包中安装你需要的语言支持，例如 `npm install @codemirror/lang-javascript @codemirror/lang-css @codemirror/lang-html`。
    2.  **动态加载**：在 `useCodeMirror` hook 或 `Editor` 组件中，创建一个函数，根据文件名后缀 (`.js`, `.css`, `.html` 等) 来决定加载哪个语言扩展 (例如 `javascript()`, `css()`, `html()`)。
    3.  **动态配置**：使用 CodeMirror 的 `Compartment` 来动态地重新配置语言扩展，就像我们之前动态配置字体大小一样。

---

### 阶段五：迈向集成开发环境 (IDE)

*这个阶段的目标是加入超越“文本编辑”范畴的强大功能。*

#### 1. 集成终端 (Integrated Terminal)

*   **目标**：在编辑器底部实现一个可以打开和交互的终端面板，这是现代 IDE 的标志性功能。
*   **思路**：
    1.  **核心依赖**：这是最有挑战性的功能。你需要两个关键库：
        *   `node-pty`：在 Electron 的主进程中创建一个伪终端进程，它可以连接到系统的 Shell (bash, zsh, powershell)。
        *   `xterm.js`：一个功能齐全的前端终端渲染库，它会在你的 React 组件中创建一个真实的终端 UI。
    2.  **IPC 通信**：主进程中的 `node-pty` 负责运行真实的 Shell，渲染进程中的 `xterm.js` 负责显示。你需要建立一套 IPC 通道，用于在它们之间双向传递数据流（用户输入传给主进程，Shell 输出传给渲染进程）。

#### 2. 实现命令面板 (Command Palette)

*   **目标**：实现类似 VS Code 的 `Ctrl+Shift+P` 功能，弹出一个输入框，可以快速搜索并执行各种命令（如新建文件、保存、切换主题等）。
*   **思路**：
    1.  **UI 组件**：创建一个模态框（Modal）组件作为命令面板。
    2.  **状态管理**：用一个 state 来控制面板的显示/隐藏。
    3.  **命令注册**：在 `App.tsx` 中定义一个命令列表，每个命令包含一个名称（用于显示和搜索）和一个要执行的函数，例如 `[{ id: 'file.save', name: 'File: Save', action: handleSave }, ...]`。
    4.  **功能实现**：在命令面板中，实现一个输入框用于模糊搜索命令列表，并渲染出匹配的结果。用户选择一个命令后，执行其对应的 `action` 函数。

---

### 阶段六：高级功能与生态系统

*这个阶段是长远目标，会让你的编辑器变得真正强大和可扩展。*

#### 1. 代码自动补全 (IntelliSense)

*   **目标**：在用户输入时，提供代码建议和补全。
*   **思路**：
    1.  **CodeMirror 模块**：使用 `@codemirror/autocomplete` 模块，这是实现自动补全的基础。
    2.  **补全源 (Source)**：自动补全的核心是提供“补全源”。最简单的是基于当前文档中的单词进行补全。要实现像 VS Code 那样智能的补全，则需要集成语言服务器协议 (LSP)，或者为每种语言编写复杂的补全逻辑。这是一个非常深入的领域。

#### 2. 问题诊断与 Linting

*   **目标**：在代码中用波浪线标出错误和警告。
*   **思路**：
    1.  **CodeMirror 模块**：使用 `@codemirror/lint` 模块。
    2.  **Linter 集成**：你需要将 ESLint (for JavaScript), Stylelint (for CSS) 等工具集成进来，让它们分析代码，然后将发现的问题转换成 CodeMirror `lint` 模块需要的格式来显示。

#### 3. Git 集成

*   **目标**：在文件树中显示文件的 Git 状态（已修改、新文件等），并提供基本的 Git 操作。
*   **思路**：
    1.  **后端库**：在主进程中使用像 `isomorphic-git` 这样的库，它可以用纯 JavaScript 来执行 Git 命令（`git status`, `git diff` 等），而无需用户安装 Git。
    2.  **IPC 通信**：主进程定期或在特定操作后运行 `git status`，然后将结果通过 IPC 发送给渲染进程。
    3.  **UI 显示**：渲染进程根据收到的 Git 状态，在文件树的项旁边显示不同的颜色或图标。