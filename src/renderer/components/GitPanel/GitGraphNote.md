# Git 图形化操作添加指南

## 🎯 需求场景

添加类似 GitKraken、SourceTree 的图形化 Git 分支树，显示：
- 分支关系图
- 提交节点
- 合并线
- 标签标记
- 分支指针

---

## 📝 修改文件清单

### 1️⃣ **添加新的标签页常量**

**文件**: `src/renderer/components/GitPanel/GitPanel.tsx`

```typescript
const GIT_PANEL_TABS = {
    CHANGES: 'changes',
    BRANCHES: 'branches',
    HISTORY: 'history',
    GRAPH: 'graph',  // ← 新增
} as const;
```

---

### 2️⃣ **创建图形化组件**

**新建文件**: `src/renderer/components/GitPanel/tabs/GraphTab.tsx`

```typescript
// src/renderer/components/GitPanel/tabs/GraphTab.tsx
import React from 'react';
import { GitCommit, GitBranch } from '../../../../main/lib/git-service';

interface GraphTabProps {
    commits: GitCommit[];
    branches: GitBranch[];
    currentBranch: string | null;
    onCheckout?: (ref: string) => void;
}

export default function GraphTab({ 
    commits, 
    branches, 
    currentBranch,
    onCheckout 
}: GraphTabProps) {
    // TODO: 实现图形化逻辑
    return (
        <div className="git-graph">
            <canvas 
                ref={canvasRef} 
                className="git-graph-canvas"
            />
            <div className="git-graph-commits">
                {/* 提交列表与图形同步显示 */}
            </div>
        </div>
    );
}
```

---

### 3️⃣ **创建图形化样式**

**新建文件**: `src/renderer/components/GitPanel/tabs/GraphTab.css`

```css
/* src/renderer/components/GitPanel/tabs/GraphTab.css */

.git-graph {
    display: flex;
    height: 100%;
    background-color: var(--bg-sidebar);
}

.git-graph-canvas {
    flex-shrink: 0;
    width: 80px; /* 图形区域宽度 */
    background-color: var(--bg-panel);
}

.git-graph-commits {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
}

.git-graph-commit-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    min-height: 60px; /* 与 canvas 行高对应 */
    border-bottom: 1px solid var(--border-color-light);
}

.git-graph-commit-item:hover {
    background-color: var(--bg-hover);
}

/* 分支标签 */
.git-graph-branch-tag {
    display: inline-block;
    padding: 2px 8px;
    margin-right: 6px;
    background-color: var(--git-green);
    color: var(--bg-sidebar);
    font-size: 11px;
    border-radius: 3px;
    font-weight: 600;
}

.git-graph-branch-tag.remote {
    background-color: var(--git-yellow);
}

.git-graph-branch-tag.tag {
    background-color: var(--accent-color);
}
```

---

### 4️⃣ **在主组件添加标签页**

**文件**: `src/renderer/components/GitPanel/GitPanel.tsx`

```typescript
// 1. 导入 CSS
import './tabs/GraphTab.css';

// 2. 导入组件
import GraphTab from './tabs/GraphTab';

// 3. 添加标签按钮
<div className="git-tabs">
    {/* ...现有标签... */}
    <button
        className={`git-tab ${activeTab === GIT_PANEL_TABS.GRAPH ? 'active' : ''}`}
        onClick={() => setActiveTab(GIT_PANEL_TABS.GRAPH)}
    >
        Graph
    </button>
</div>

// 4. 添加标签内容
<div className="git-content">
    {/* ...现有标签页... */}
    
    {activeTab === GIT_PANEL_TABS.GRAPH && (
        <GraphTab
            commits={commits}
            branches={branches}
            currentBranch={currentBranch}
            onCheckout={operations.handleCheckoutBranch}
        />
    )}
</div>
```

---

### 5️⃣ **扩展 Git 数据（可选）**

如果需要更详细的图形数据（如父提交、合并关系），需要修改：

**文件**: `src/renderer/components/GitPanel/hooks/useGitData.ts`

```typescript
// 可选：添加获取图形数据的方法
const loadGraphData = useCallback(async () => {
    // 获取包含父提交信息的完整数据
    const result = await window.electronAPI.gitGetGraphData();
    setGraphData(result);
}, []);
```

**对应的后端文件**（如果需要）:
- `src/main/lib/git-service.ts` - 添加获取图形数据的方法

---

## 🎨 图形化实现方案

### 方案 A: Canvas 原生绘制（推荐）

**优点**: 性能好，完全可控  
**缺点**: 需要自己实现绘制逻辑

**关键步骤**:
1. 计算提交树的坐标
2. 在 Canvas 上绘制连接线
3. 绘制提交节点
4. 处理鼠标交互（hover、click）

**参考实现**:
```typescript
// GraphTab.tsx 中
const drawGraph = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 绘制连接线
    commits.forEach((commit, index) => {
        // 计算位置
        const x = 40; // 中心线
        const y = index * 60 + 30;
        
        // 绘制节点
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = getBranchColor(commit);
        ctx.fill();
        
        // 绘制连接线到父提交
        if (commit.parents) {
            // ... 绘制线条逻辑
        }
    });
};
```

---

### 方案 B: 使用 D3.js（功能强大）

**文件**: `src/renderer/components/GitPanel/tabs/GraphTab.tsx`

```typescript
import * as d3 from 'd3';

useEffect(() => {
    // 使用 D3 绘制 Git 树
    const svg = d3.select(svgRef.current);
    
    // D3 力导向图或树形布局
    const tree = d3.tree().size([height, width]);
    // ... D3 绘制逻辑
}, [commits, branches]);
```

**优点**: 强大的图形能力，动画效果好  
**缺点**: 增加依赖，包体积增大

---

### 方案 C: 使用现成库 - gitgraph.js

**安装**:
```bash
npm install @gitgraph/react
```

**文件**: `src/renderer/components/GitPanel/tabs/GraphTab.tsx`

```typescript
import { Gitgraph } from '@gitgraph/react';

export default function GraphTab({ commits, branches }) {
    return (
        <div className="git-graph">
            <Gitgraph>
                {(gitgraph) => {
                    commits.forEach(commit => {
                        gitgraph.commit({
                            subject: commit.message,
                            hash: commit.hash,
                            author: commit.author,
                        });
                    });
                }}
            </Gitgraph>
        </div>
    );
}
```

**优点**: 开箱即用，专为 Git 设计  
**缺点**: 定制化程度较低

---

## 📊 完整修改清单

| 序号 | 文件路径 | 操作 | 必须性 |
|------|----------|------|--------|
| 1 | `GitPanel.tsx` | 修改 | ✅ 必须 |
| 2 | `tabs/GraphTab.tsx` | 新建 | ✅ 必须 |
| 3 | `tabs/GraphTab.css` | 新建 | ✅ 必须 |
| 4 | `hooks/useGitData.ts` | 修改 | ⚪ 可选 |
| 5 | `main/lib/git-service.ts` | 修改 | ⚪ 可选 |

---

## 🚀 开发步骤建议

### Step 1: 先创建空标签页
1. 创建 `GraphTab.tsx` 和 `GraphTab.css`
2. 在 `GitPanel.tsx` 中添加标签
3. 测试标签切换是否正常

### Step 2: 显示简单列表
1. 先用简单的列表显示提交
2. 确保数据传递正确

### Step 3: 添加图形绘制
1. 选择一个实现方案
2. 逐步实现图形功能
3. 添加交互功能

### Step 4: 优化和美化
1. 调整样式
2. 添加动画效果
3. 性能优化

---

## 💡 推荐实现顺序

```
1. 简单列表展示（1小时）
   ↓
2. Canvas 绘制基础线条（2-3小时）
   ↓
3. 添加分支颜色区分（1小时）
   ↓
4. 添加鼠标交互（1-2小时）
   ↓
5. 优化性能和样式（1-2小时）
```

**总计**: 约 6-9 小时完成基础版本

---

## 🎁 额外功能建议

完成基础图形后，可以考虑：

1. **右键菜单**: 在提交上右键显示操作菜单
2. **搜索过滤**: 按分支、作者、时间过滤
3. **比较功能**: 选择两个提交进行对比
4. **Cherry-pick**: 拖拽提交到其他分支
5. **Rebase 可视化**: 显示 rebase 过程

---

## 📚 参考资源

- **Canvas 教程**: MDN Canvas API
- **D3.js**: https://d3js.org/
- **Gitgraph.js**: https://gitgraphjs.com/
- **VS Code Git Graph**: 参考开源实现
- **GitKraken**: UI 设计参考

---

## ⚠️ 注意事项

1. **性能考虑**:
    - 大量提交时使用虚拟滚动
    - Canvas 比 SVG 性能更好

2. **数据结构**:
    - 确保能获取到父提交信息
    - 需要分支指针位置信息

3. **交互体验**:
    - 缩放功能（大型仓库）
    - 流畅的滚动和动画

4. **兼容性**:
    - 保持与现有功能的一致性
    - 不影响其他标签页