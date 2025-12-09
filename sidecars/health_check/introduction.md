# 代码健康检查模块 - 部署指南

## 📦 目录结构

```
your-electron-app/
├── sidecars/
│   └── health_check/          # Python 模块
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── core/
│       │   └── scanner.py
│       ├── analyzers/
│       │   ├── base.py
│       │   ├── metrics.py
│       │   ├── quality.py
│       │   ├── security.py
│       │   └── dependencies.py
│       ├── integrations/
│       │   └── git_analyzer.py
│       ├── utils/
│       │   └── file_utils.py
│       └── reporters/
│           └── html_reporter.py
│
├── src/
│   ├── main/
│   │   ├── lib/
│   │   │   └── health-check-service.ts
│   │   ├── ipc-handlers/
│   │   │   └── health-check.handlers.ts
│   │   └── preload.ts
│   │
│   └── renderer/
│       └── features/
│           └── health-check/
│               ├── types.ts
│               ├── hooks/
│               │   └── useHealthCheck.ts
│               └── components/
│                   ├── HealthCheckPanel.tsx
│                   └── HealthCheckPanel.css
│
└── package.json
```

## 🔧 安装依赖

### 1. Python 依赖

创建 `sidecars/health_check/requirements.txt`：

```txt
# 无需额外依赖！所有代码使用 Python 标准库
# 如果需要更高级的功能，可添加：
# pandas>=1.5.0       # 数据分析
# plotly>=5.0.0       # 交互式图表
# gitpython>=3.1.0    # 更强大的 Git 集成
```

### 2. TypeScript 类型定义

在 `src/renderer/global.d.ts` 添加：

```typescript
interface Window {
  healthCheck: {
    scan: (projectPath: string, options?: any) => Promise<{
      success: boolean;
      data?: any;
      error?: string;
    }>;
    stop: () => Promise<{ success: boolean }>;
  };
}
```

## 📝 Electron Builder 配置

在 `package.json` 中添加打包配置：

```json
{
  "build": {
    "extraResources": [
      {
        "from": "sidecars/health_check",
        "to": "sidecars/health_check",
        "filter": ["**/*.py"]
      }
    ],
    "files": [
      "dist/**/*",
      "package.json"
    ]
  }
}
```

## 🚀 集成步骤

### Step 1: 复制 Python 代码

将所有 Python 文件放入 `sidecars/health_check/` 目录。

### Step 2: 注册 IPC 处理器

在 `src/main/index.ts` 中：

```typescript
import { registerHealthCheckHandlers } from './ipc-handlers/health-check.handlers';

app.whenReady().then(() => {
  // ... 其他初始化代码
  
  registerHealthCheckHandlers();
  
  createWindow();
});
```

### Step 3: 更新 Preload 脚本

确保 `src/main/preload.ts` 暴露了 `healthCheck` API（参见集成代码）。

### Step 4: 添加 UI 组件

在你的应用中添加健康检查面板（参见 `HealthCheckPanel.tsx`）。

## 🧪 测试

### 独立测试（不依赖 Electron）

```bash
cd sidecars/health_check
python main.py /path/to/your/project --report
```

### 在 Electron 中测试

```bash
npm run dev
```

在应用中选择一个项目路径，点击"开始扫描"。

## 📊 生成报告

### 方法 1: 通过 Python 直接生成

```python
from sidecars.health_check.main import HealthCheckService
from sidecars.health_check.reporters.html_reporter import generate_html_report

service = HealthCheckService()
result = service.scan_project('/path/to/project')
report_path = generate_html_report(result)
print(f"Report generated: {report_path}")
```

### 方法 2: 在 Electron 中生成

```typescript
// 扫描完成后
const result = await window.healthCheck.scan(projectPath);

// 将数据传给主进程生成报告
ipcRenderer.send('health-check:generate-report', result.data);
```

主进程处理器：

```typescript
ipcMain.on('health-check:generate-report', (event, data) => {
  const reportPath = path.join(app.getPath('temp'), 'health_report.html');
  
  // 调用 Python 生成报告或使用 Node.js 生成
  // ...
  
  shell.openPath(reportPath);
});
```

## ⚙️ 配置选项

### 修改扫描阈值

编辑 `sidecars/health_check/config.py`：

```python
THRESHOLDS = {
    'fat_file': 500,        # 将"大文件"阈值提高到 500 行
    'complex_function': 30, # 更宽松的复杂度
    # ...
}
```

### 忽略更多目录

```python
IGNORE_DIRS = {
    '.git', 'node_modules', 'dist', 'build',
    'my_custom_folder',  # 添加自定义忽略
}
```

### 自定义分析器

创建新的分析器 `sidecars/health_check/analyzers/custom.py`：

```python
from .base import BaseAnalyzer

class CustomAnalyzer(BaseAnalyzer):
    def analyze(self, filepath, rel_path, content_lines):
        # 你的自定义逻辑
        return {
            'custom_metric': 42
        }
```

在 `scanner.py` 中注册：

```python
self.analyzers = {
    'metrics': MetricsAnalyzer(config),
    'quality': QualityAnalyzer(config),
    'custom': CustomAnalyzer(config),  # 添加这行
}
```

## 🐛 故障排除

### Python 进程无法启动

**问题**: `Error: spawn python ENOENT`

**解决**:
1. 确保系统已安装 Python 3.7+
2. 检查 `pythonPath` 是否正确
3. 尝试使用 `python3` 而不是 `python`

### 扫描超时

**问题**: 大项目扫描超过 60 秒

**解决**: 在 `health-check-service.ts` 中增加超时时间：

```typescript
setTimeout(() => {
  // ...
}, 300000); // 改为 5 分钟
```

### 中文乱码

**问题**: Windows 下输出乱码

**解决**: 已在代码中通过 `sys.stdout.reconfigure(encoding='utf-8')` 处理，如果仍有问题：

```typescript
const process = spawn(this.pythonPath, [...args], {
  env: { 
    ...process.env, 
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1'  // 添加这行
  }
});
```

### Git 分析失败

**问题**: `git` 命令找不到

**解决**: 确保 Git 在 PATH 中，或在打包时包含 Git：

```json
{
  "build": {
    "extraFiles": [
      {
        "from": "path/to/git",
        "to": "git"
      }
    ]
  }
}
```

## 🚢 打包发布

### Windows

```bash
npm run build:win
```

确保 Python 嵌入式版本打包进去：
1. 下载 Python embeddable package
2. 放入 `resources/python/`
3. 更新 `pythonPath` 指向打包后的路径

### macOS

```bash
npm run build:mac
```

需要签名和公证（如果分发）。

### Linux

```bash
npm run build:linux
```

系统 Python 通常可用，无需打包。

## 📈 性能优化

### 1. 并行处理

对于大型项目，可以启用多进程：

```python
from concurrent.futures import ProcessPoolExecutor

# 在 scanner.py 中
with ProcessPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(self._analyze_file, f) for f in files]
    results = [f.result() for f in futures]
```

### 2. 增量扫描

只扫描修改过的文件：

```python
# 保存上次扫描的文件哈希
# 下次扫描时对比，跳过未变化的文件
```

### 3. 缓存结果

```python
import json
import os

cache_file = '.health_check_cache.json'

if os.path.exists(cache_file):
    with open(cache_file) as f:
        cached = json.load(f)
```

## 📚 扩展功能建议

### 1. AI 代码审查

集成 OpenAI API 进行智能代码审查：

```python
import openai

def ai_code_review(file_content):
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{
            "role": "user",
            "content": f"Review this code:\n{file_content}"
        }]
    )
    return response.choices[0].message.content
```

### 2. 持续监控

添加文件监听，实时检测代码质量变化：

```typescript
import chokidar from 'chokidar';

const watcher = chokidar.watch(projectPath);
watcher.on('change', (path) => {
  // 触发增量扫描
});
```

### 3. 团队协作

将扫描结果上传到服务器，生成团队报告：

```python
import requests

def upload_results(data):
    requests.post('https://your-server.com/api/health-check', json=data)
```

### 4. CI/CD 集成

在 GitHub Actions 中运行：

```yaml
name: Code Health Check
on: [push, pull_request]
jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.10'
      - run: python sidecars/health_check/main.py . --report
      - uses: actions/upload-artifact@v2
        with:
          name: health-report
          path: health_report.html
```

## 📝 许可证

本模块使用 MIT 许可证，可自由集成到你的项目中。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！