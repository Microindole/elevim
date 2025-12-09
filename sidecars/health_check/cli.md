这是一个 Python 的命令行接口（CLI）。让我详细解释如何使用：

## 🎯 基本用法

### 1. **最简单的使用 - 扫描项目**
```bash
python main.py /path/to/your/project
```
输出结果：
```
🔍 扫描项目: /path/to/your/project

📊 扫描完成！
  • 文件: 169
  • 代码行: 30507
  • 问题: 33
  • 耗时: 0.39s
```

### 2. **生成 HTML 报告**
```bash
python main.py /path/to/your/project --report
```
会自动：
- 生成 `health_report.html` 文件
- 在浏览器中打开报告

### 3. **禁用 Git 分析**（如果不是 Git 仓库或想加速）
```bash
python main.py /path/to/your/project --no-git
```

### 4. **子进程模式**（供 Electron 调用，不需要手动运行）
```bash
python main.py /path/to/your/project --mode service
```

## 📝 完整命令格式

```bash
python main.py <项目路径> [选项]

必需参数:
  path                项目路径（相对或绝对路径）

可选参数:
  --mode {service,cli}    运行模式（默认: cli）
                          - cli: 命令行模式，直接输出结果
                          - service: 服务模式，通过 stdin/stdout 与 Electron 通信
  
  --report               生成 HTML 报告并自动打开
  
  --no-git               禁用 Git 分析（不读取提交历史）
```

## 💡 实际使用示例

### 示例 1：快速检查当前项目
```bash
cd /path/to/your/project
python /path/to/sidecars/health_check/main.py .
```

### 示例 2：分析其他项目并生成报告
```bash
python main.py ~/Desktop/MyApp --report
```

### 示例 3：分析非 Git 项目
```bash
python main.py /some/folder --no-git --report
```

### 示例 4：在 Electron 中使用（TypeScript 调用）
```typescript
// Electron 会这样调用：
const process = spawn('python', [
  'main.py',
  '/path/to/project',
  '--mode', 'service'
]);
```

## 🔧 工作原理

让我用注释详细解释代码：

```python
if __name__ == "__main__":
    import argparse
    
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description='代码健康检查工具')
    
    # 位置参数：必须提供的项目路径
    parser.add_argument('path', help='项目路径')
    
    # 可选参数：运行模式
    parser.add_argument('--mode', 
                       choices=['service', 'cli'],  # 只允许这两个值
                       default='cli',               # 默认是 cli
                       help='运行模式: service=子进程模式, cli=命令行模式')
    
    # 开关参数：是否生成报告（有这个参数就是 True，没有就是 False）
    parser.add_argument('--report', 
                       action='store_true',  # 这是一个开关
                       help='生成HTML报告')
    
    # 开关参数：是否禁用 Git
    parser.add_argument('--no-git', 
                       action='store_true',
                       help='禁用Git分析')
    
    # 解析命令行参数
    args = parser.parse_args()
    
    # 创建服务实例
    service = HealthCheckService()
    
    # 根据模式决定运行方式
    if args.mode == 'service':
        # 服务模式：进入消息循环，等待 Electron 发送 JSON 请求
        service.run_as_service()
    else:
        # CLI 模式：直接扫描并输出
        print(f"🔍 扫描项目: {args.path}")
        
        # 执行扫描
        result = service.scan_project(args.path, {
            'enable_git': not args.no_git  # 如果有 --no-git，就禁用
        })
        
        # 输出结果摘要
        print(f"\n📊 扫描完成！")
        print(f"  • 文件: {result['summary']['files']}")
        print(f"  • 代码行: {result['summary']['code_lines']}")
        print(f"  • 问题: {result['summary']['issues']}")
        print(f"  • 耗时: {result['summary']['scan_time']}s")
        
        # 如果指定了 --report，生成 HTML
        if args.report:
            from .reporters.html_reporter import generate_html_report
            report_path = generate_html_report(result)
            print(f"\n📄 报告已生成: {report_path}")
            
            # 自动在浏览器中打开
            import webbrowser
            webbrowser.open('file://' + report_path)
```

## 🎨 输出示例

运行 `python main.py ~/MyProject --report` 后：

```
🔍 扫描项目: /Users/you/MyProject

📊 扫描完成！
  • 文件: 169
  • 代码行: 30507
  • 问题: 33
  • 耗时: 0.39s

📄 报告已生成: /path/to/health_report.html
```

然后浏览器会自动打开显示漂亮的 HTML 报告。

## 🐍 为什么要这样设计？

1. **灵活性**：既可以独立使用（CLI），也可以被 Electron 调用（service）
2. **易测试**：不需要 Electron 环境就能测试功能
3. **自动化**：可以在 CI/CD 中使用
4. **用户友好**：有 `--help` 自动生成帮助文档

试试运行：
```bash
python main.py --help
```