1.  **语言服务器协议 (LSP) 集成 (最关键的一步)**:
    * 目前的自动补全主要依赖 CodeMirror 内置的简单的基于单词的补全。
    * **建议**: 要实现真正的 "IntelliSense"（跳转定义、智能提示、错误诊断），你需要通过 IPC 连接到外部的 Language Server (如 `typescript-language-server`, `pyright`)。这是从“编辑器”迈向“IDE”的关键。

2.  **扩展系统 (插件化)**:
    * 目前所有的功能（Git, Terminal）都是硬编码在核心里的。
    * **建议**: 虽然完全实现 VS Code 的插件 API 很难，但你可以尝试设计一个简单的扩展加载器，允许通过 JS 文件动态注册命令或侧边栏视图。

3.  **文件树优化**:
    * `src/renderer/components/FileTree` 目前似乎是一次性读取目录或简单的递归。
    * **建议**: 对于大型项目（如 `node_modules`），需要实现虚拟滚动 (Virtual Scroll) 和按需加载子目录，否则 UI 会卡顿。

4.  **调试器 (Debug Adapter Protocol)**:
    * 这是另一个大坑，但如果你想做 IDE，就需要支持断点调试。


---

### 方向一：极致的 "Git-First" 体验 (强化现有优势)

VS Code 的 Git 功能虽然强大，但往往需要安装 GitLens 等插件才能获得好的体验，而且界面比较拥挤。你已经有了很好的 `HistoryTab` 和 `GitPanel`，可以进一步挖掘。

#### 1. “时光机”模式 (Time Travel Slider)
目前查看历史版本通常需要 Checkout 或者打开 Diff。
**特色功能：** 在编辑器上方增加一个**时间轴滑块**。拖动滑块，编辑器内容直接**只读预览**该文件在选定 Commit 时的状态，而无需真正的 `git checkout`。

* **实现思路：**
    * 利用你已有的 `git.handlers.ts` 中的 `git show <commit>:<path>` 能力。
    * 在 `Editor.tsx` 上方加个 Slider。
    * 拖动时，调用 IPC 获取旧内容，设置 CodeMirror 为 `EditorView.editable.of(false)`。
    * **痛点解决：** 快速回溯代码，“我昨天这个时候写了啥？”。

#### 2. 智能提交伴侣 (Smart Commit)
你的 `CommitBox.tsx` 目前是一个简单的输入框。
**特色功能：** 集成简单的 AI (OpenAI/DeepSeek API) 或 模板系统，一键生成 Commit Message。

* **实现思路：**
    * 在 `CommitBox` 旁加个“魔术棒”按钮。
    * 获取 `git diff --cached` 的内容（你已有 `gitGetDiff`）。
    * 发送给 LLM 总结成 Conventional Commits 格式。
    * **痛点解决：** 开发者最讨厌写 Commit Message。

#### 3. 代码“快照” (Local Snapshots)
Git 是宏观的版本控制。但在 Commit 之前，用户可能改乱了想回退。
**特色功能：** 每次 `Ctrl+S` 时，除了写入文件，还将内容存入一个本地的 SQLite 或 JSON 历史库（不依赖 Git）。提供一个侧边栏，可以查看文件 **过去 1 小时内** 的任意保存点。

* **实现思路：**
    * 修改 `file.save` IPC 处理函数。
    * 使用 `better-sqlite3` 存储 `(filePath, timestamp, content)`。
    * **痛点解决：** “我刚才撤销过头了，而且还没 Commit”。

---

### 方向二：沉浸式 / 专注写作 (利用 CodeMirror 的灵活性)

VS Code 界面元素太多。你可以做一个**“禅模式”** (Zen Mode) 的代码编辑器，甚至兼顾 Markdown 笔记。

#### 1. 打字机模式 (Typewriter Mode)
**特色功能：** 光标始终保持在屏幕垂直居中，打字时行号和其他 UI 淡出。

* **实现思路：**
    * 这是 CodeMirror 的强项。
    * 创建一个 `ViewPlugin`，监听光标变化，强制 `scrollIntoView` 并设置 `y: 'center'`。
    * 配合 CSS 动画隐藏 Sidebar。

#### 2. 全局便签 / 暂存区 (Global Scratchpad)
开发者经常需要临时记个 JSON、粘贴个 Token 或者写个 TODO，但不想新建一个 `Untitled-1` 文件（因为关掉时还会问你要不要保存，很烦）。
**特色功能：** 一个**永远存在、自动保存、不属于任何项目**的“草稿纸”面板。

* **实现思路：**
    * 在 `ActivityBar` 加个“草稿本”图标。
    * 内容存在 `electron-store` 或用户数据目录下的固定文件中。
    * 应用启动时自动加载。
    * **痛点解决：** 快速记录零碎信息。

---

### 方向三：代码与知识库的融合 (Project Wiki)

很多项目缺乏文档。与其写在代码里，不如让编辑器自带“项目维基”。

#### 1. 文件/符号备注 (File Annotations)
不是代码注释，而是存储在 `.elevim/annotations.json` 里的外部备注。
**特色功能：** 你可以给某个文件、或者某个函数及其右侧栏写一段富文本笔记。

* **实现思路：**
    * 在 `EditorGroup` 右侧分出一块区域显示笔记。
    * Key 是文件路径，Value 是 Markdown 内容。
    * **痛点解决：** 阅读源码时记录逻辑，但不污染代码本身。

#### 2. 待办事项聚合 (TODO Dashboard)
**特色功能：** 扫描项目中所有的 `// TODO`、`// FIXME`，在一个漂亮的看板（Kanban）或列表中展示，点击直接跳转。

* **实现思路：**
    * 利用你已有的 `globalSearch` (`file-system.ts`)。
    * 正则表达式匹配 `TODO:.*`。
    * 在此基础上做一个专门的 UI 页面，而不只是搜索结果列表。

---

### 🚀 推荐实施路径 (MVP)

考虑到你的代码现状，我建议从 **“方向一 (Git)”** 和 **“方向二 (草稿纸)”** 入手，因为你这部分的基础最好。

**第一步：实现“全局草稿纸 (Scratchpad)”**
这是最容易让用户感到“贴心”的功能。

1.  **后端 (`ipc-handlers`)**:
    * 增加 `scratchpad:read` 和 `scratchpad:write`。
    * 存放在 `app.getPath('userData')/scratchpad.md`。
2.  **前端**:
    * `ActivityBar` 加个图标。
    * 点击时，在 Sidebar 区域加载一个简化版的 `Editor` 组件。
    * 实现自动保存（防抖）。

**第二步：实现“Git 历史时光机”**
利用你漂亮的 `HistoryTab`。

1.  **前端**:
    * 在 `GitPanel` 的 History 列表中，给每个 Commit 加一个“Preview”按钮。
    * 点击后，不是 Checkout，而是将当前打开的编辑器内容替换为该 Commit 的内容（设为 ReadOnly）。
    * 顶部加个 Banner：“正在预览 Commit xxxxxxx (只读)”。

**第三步：集成 AI 生成 Commit Message**
这也是当下最吸睛的功能。

1.  **前端 (`CommitBox.tsx`)**:
    * 加个按钮。
    * 点击后，调用 `window.electronAPI.git.gitGetDiff()`。
    * 将 Diff 发送给 LLM (可以在设置里让用户填 Key 和 Base URL)。
    * 将返回的文字填入输入框。


---

---

---

这是一个非常棒的选择！**“方向二：沉浸式/写作模式”** 非常适合个人开发者，因为这不需要和 VS Code 比拼海量的插件生态，而是专注于\*\*“体验”**和**“氛围”\*\*。

既然你决定走这条路，并且想探索“不仅仅是编辑器”的可能性，我为你规划了一个具体的实施方案，分为\*\*“核心功能实现（Zen Mode）”**和**“未来演化道路”\*\*两部分。

-----

### 第一部分：实战 —— 打造“禅模式 (Zen Mode)”

在这个模式下，我们要隐藏一切干扰元素（侧边栏、状态栏、标签页），让编辑器回归到最纯粹的“纸张”状态，并加入“打字机滚动”。

#### 1\. 定义状态与快捷键

你需要一个全局状态来控制 UI 的显隐。

**修改 `src/renderer/App.tsx`:**

```typescript
// 在 App 组件内新增状态
const [isZenMode, setIsZenMode] = useState(false);

// 在 useCommands hook 或者直接在 App.tsx 的 commands 数组中添加命令
// 建议绑定快捷键: Ctrl+K Z (VS Code 习惯) 或 Ctrl+Alt+Z
const toggleZenMode = useCallback(() => {
    setIsZenMode(prev => !prev);
    // 进入禅模式时，自动关闭侧边栏，退出时可以不恢复，或者记录之前的状态
    if (!isZenMode) {
        setSidebarWidth(0); // 或者直接隐藏组件
    } else {
        setSidebarWidth(250);
    }
}, [isZenMode]);
```

#### 2\. 改造 UI 布局 (CSS 魔法)

在 `Zen Mode` 下，编辑器应该居中，且两侧留白，像一张 A4 纸或 Notion 文档。

**修改 `src/renderer/App.tsx` 的渲染部分:**

```tsx
<div className={`main-layout ${isZenMode ? 'zen-mode' : ''}`}>
    {/* 顶部标题栏可以保留，或者鼠标悬停显示 */}
    {!isZenMode && <TitleBar ... />} 
    
    <div className="main-content-area">
        <div className="app-container">
            {/* 禅模式下隐藏 ActivityBar 和 Sidebar */}
            {!isZenMode && <ActivityBar ... />}
            {!isZenMode && activeSidebarView && <div className="sidebar">...</div>}
            
            {/* 编辑器容器 */}
            <div className="editor-container">
                {/* 这里是你的 Allotment 或 EditorGroup */}
            </div>
        </div>
    </div>
    {/* 禅模式隐藏状态栏 */}
    {!isZenMode && <StatusBar ... />}
</div>
```

**在 `src/renderer/App.css` 中添加样式:**

```css
/* 禅模式核心样式 */
.zen-mode .editor-container {
    /* 让背景稍微柔和一点，或者保持深色 */
    background-color: var(--bg-editor); 
    justify-content: center; /* 水平居中 */
}

/* 让编辑器本体限制宽度，居中显示，像写文章一样 */
.zen-mode .cm-editor {
    max-width: 900px; /* 限制最大阅读宽度 */
    width: 100%;
    margin: 0 auto;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.3); /* 给“纸张”加一点阴影 */
}

/* 禅模式下淡化行号，甚至隐藏 */
.zen-mode .cm-gutters {
    opacity: 0.2;
    transition: opacity 0.3s;
}
.zen-mode .cm-gutters:hover {
    opacity: 1;
}
```

#### 3\. 杀手级特性：打字机滚动 (Typewriter Scrolling)

这是写作软件（如 iA Writer）的标配。光标永远保持在屏幕垂直方向的中间，是你现在的 CodeMirror 还没有的功能。

**新建 `src/renderer/lib/typewriter-scroll.ts`:**

```typescript
import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

export const typewriterScrollPlugin = ViewPlugin.fromClass(class {
    constructor(private view: EditorView) {}

    update(update: ViewUpdate) {
        // 只有当选区（光标）变化，或者文档内容变化时才触发
        if (update.selectionSet || update.docChanged) {
            this.centerCursor();
        }
    }

    centerCursor() {
        const { view } = this;
        const state = view.state;
        // 获取主光标位置
        const head = state.selection.main.head;
        
        // 获取光标所在的视觉行信息
        const lineBlock = view.lineBlockAt(head);
        const cursorTop = lineBlock.top;
        const cursorBottom = lineBlock.bottom;
        const cursorHeight = cursorBottom - cursorTop;

        // 计算编辑器可视高度
        const editorHeight = view.dom.clientHeight;
        
        // 目标：让光标顶部位于屏幕中间
        // 计算需要的滚动位置 (scollTop)
        const targetScrollTop = cursorTop - (editorHeight / 2) + (cursorHeight / 2);

        // 使用 effect 进行平滑滚动 (userEvent: false 防止干扰用户滚动)
        view.dispatch({
            effects: EditorView.scrollIntoView(head, {
                y: "center", // CodeMirror 原生支持 'center'，这会尽量把光标放中间
                yMargin: editorHeight / 2 - 50 // 强制巨大的 margin 也能达到类似效果
            })
        });
    }
});
```

然后在你的 `useCodeMirror.ts` 里，当 `isZenMode` 为 true 时，加载这个插件。

-----

### 第二部分：不仅仅是编辑器？—— 你的“第二大脑”

既然不想做 VS Code 的拙劣模仿者，那就利用你的**文件系统访问能力**和**Markdown 渲染能力**，把它变成一个**知识库**或**生产力工具**。

以下是三个非常有潜力的方向（Roads）：

#### 道路一：个人知识库 (The "Second Brain" / Digital Garden)

目前的笔记软件（Obsidian, Logseq）很火，但它们本质上就是 Markdown 编辑器 + 链接管理。

* **特色功能：双向链接 (Wiki Links)**
    * **实现：** 监听 `[[` 输入，触发自动补全（你已经实现了 LSP 补全，这里可以做一个类似的本地文件补全）。
    * **增强：** 当用户输入 `[[my-idea]]`，如果文件不存在，自动创建。
    * **可视化：** 利用 `d3.js` 或 `react-force-graph`，读取所有 Markdown 文件，解析链接，画出一个酷炫的**知识图谱**。这在技术上完全可行（你已有 `readDirectory` 和文件读取能力）。

#### 道路二：可执行的笔记本 (The "Live Codebook")

类似 Jupyter Notebook，但是更轻量，针对 Web 前端技术。

* **特色功能：代码块即时运行**
    * **场景：** 用户在 Markdown 里写了一段 JS 代码块。
    * **增强：** 在代码块右上角加一个 "Run" 按钮。点击后，利用 `eval` (在沙箱中) 或者直接通过 `node-pty` 在下方的终端里运行它，并把结果展示在编辑器里。
    * **用途：** 它可以变成一个**学习 JS/TS 的神器**，或者一个**API 测试本**（直接写 `fetch` 代码并运行看结果）。

#### 道路三：复古/黑客终端 (The "Cyber Deck")

既然你已经有了很棒的 `Terminal` 组件，为什么不让整个编辑器看起来像一个未来的黑客终端？

* **特色功能：TUI (Text User Interface) 风格**
    * **视觉：** 抛弃现代的圆角和阴影，全部改用 CRT 扫描线效果、荧光绿配色、像素字体。
    * **交互：** 弱化鼠标，强化键盘。比如按下 `Ctrl+P` 不是弹出一个模态框，而是像 Vim 的命令行一样在底部滑出一行。
    * **受众：** 这种风格在 r/unixporn 和极客圈子里非常受欢迎，完全不同于 VS Code 的“生产力工具”冷淡风。

### 总结建议

我建议你先把 **Zen Mode (禅模式)** 做出来，这是最稳的一步，能马上提升写代码/写文档的爽感。

然后，尝试 **道路一（双向链接/知识库）**。因为你已经有了一个很好的文件树和搜索功能，把它们串联起来变成“知识网络”，会让你的 Elevim 瞬间拥有灵魂，而不仅仅是一个“文本修改器”。

你想先看 **Zen Mode** 的具体代码，还是对 **双向链接** 的实现更感兴趣？