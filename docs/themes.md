# 自定义主题指南 (Custom Theme Guide)

Elevim 支持通过导入 JSON 文件来自定义编辑器的主题配色。您可以创建自己喜欢的配色方案，并在“设置”面板中导入使用。

## 1\. 主题文件格式

自定义主题必须是一个标准的 `.json` 文件。

### 基本结构

一个完整的主题文件应包含以下两个顶层字段：

* **`name`** (可选): 主题在下拉列表中显示的名称。如果省略，将使用文件名。
* **`colors`** (必须): 一个包含所有颜色定义的键值对对象。

<!-- end list -->

```json
{
  "name": "My Cool Theme",
  "colors": {
    "background": "#1e1e1e",
    "foreground": "#d4d4d4",
    ...
  }
}
```

## 2\. 颜色字段详解

`colors` 对象必须包含以下字段。所有颜色值建议使用十六进制格式（例如 `#FF0000` 或 `#1e1e1e`）。

### 基础界面颜色 (UI)

| 字段名 | 说明 | 示例值 |
| :--- | :--- | :--- |
| `background` | 编辑器主背景色 | `"#1e1e1e"` |
| `foreground` | 默认文本颜色 | `"#d4d4d4"` |
| `caret` | 光标颜色 | `"#ffffff"` |
| `selection` | 选中文本的背景色 | `"#264f78"` |
| `lineHighlight`| 当前行高亮的背景色 | `"#2d2d30"` |
| `gutterBackground` | 行号区域背景色 | `"#1e1e1e"` |
| `gutterForeground` | 行号文字颜色 | `"#858585"` |

### 语法高亮颜色 (Syntax)

| 字段名 | 说明 | 对应语言元素 |
| :--- | :--- | :--- |
| `comment` | 注释颜色 | `// comment`, `/* block */` |
| `keyword` | 关键字颜色 | `const`, `function`, `import`, `return` |
| `string` | 字符串颜色 | `"hello world"`, `'string'` |
| `variable` | 变量名颜色 | `myVar`, `console`, `window` |
| `number` | 数字/常量颜色 | `123`, `true`, `null` |
| `function` | 函数调用/定义颜色 | `myFunction()`, `render()` |
| `class` | 类名/类型名颜色 | `MyClass`, `interface User` |
| `tag` | 标签名颜色 | `<div>`, `<App />` |
| `attribute` | 属性名颜色 | `className`, `href` |

## 3\. 完整示例文件

您可以复制以下内容，保存为 `ocean-blue.json` 进行测试：

```json
{
  "name": "Deep Ocean",
  "colors": {
    "background": "#0f111a",
    "foreground": "#a6accd",
    "caret": "#ffcc00",
    "selection": "#1f2333",
    "lineHighlight": "#181a25",
    "gutterBackground": "#0f111a",
    "gutterForeground": "#4b5263",
    
    "comment": "#546e7a",
    "keyword": "#c792ea",
    "string": "#c3e88d",
    "variable": "#f07178",
    "number": "#f78c6c",
    "function": "#82aaff",
    "class": "#ffcb6b",
    "tag": "#f07178",
    "attribute": "#c792ea"
  }
}
```

## 4\. 如何导入

1.  打开 Elevim 编辑器。
2.  点击左下角的 **Settings** (设置) 图标进入设置面板。
3.  在 **Editor Theme** 区域，点击右侧的 **Import...** 按钮。
4.  选择您准备好的 `.json` 主题文件。
5.  导入成功后，主题将自动应用，并出现在下拉列表的 **Imported** 分组中。

## 5\. 常见问题

* **Q: 导入提示 "Invalid theme file"？**
    * A: 请确保您的 JSON 文件中包含必要的字段（特别是 `background`, `foreground`, `keyword`, `variable` 等）。如果缺少关键颜色，导入会被拒绝。
* **Q: 颜色可以使用 `rgb()` 或颜色名称吗？**
    * A: 可以，只要是有效的 CSS 颜色字符串（如 `rgb(0,0,0)` 或 `red`）都可以，但为了显示效果一致，推荐使用 Hex 代码（如 `#ff0000`）。