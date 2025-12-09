# ============================================================================
# sidecars/health_check/main.py
# ============================================================================
import sys
import os
import json
import time


from .core.scanner import ProjectScanner
from .integrations.git_analyzer import GitAnalyzer


# 强制 UTF-8 输出
sys.stdout.reconfigure(encoding='utf-8')


class HealthCheckService:
    """健康检查服务 - 可作为独立模块或 Electron 子进程使用"""

    def __init__(self):
        self.running = False

    def scan_project(self, root_path, options=None):
        """
        扫描项目

        Args:
            root_path: 项目根目录
            options: 可选配置
                - enable_git: 是否启用 Git 分析（默认 True）
                - enable_dependencies: 是否分析依赖（默认 True）

        Returns:
            dict: 扫描结果
        """
        options = options or {}
        start_time = time.time()

        # 1. 基础扫描
        scanner = ProjectScanner(root_path, options)
        stats = scanner.scan()

        # 2. Git 分析（可选）
        if options.get('enable_git', True):
            git = GitAnalyzer(root_path)
            churn_map = git.get_churn_map()

            # 填充 churn 数据
            for file_data in stats['files_data']:
                rel_path = file_data['path'].replace('\\', '/')
                file_data['churn'] = churn_map.get(rel_path, 0)

            # 识别热点
            for file_data in stats['files_data']:
                if file_data['complexity'] > 20 and file_data['churn'] > 5:
                    stats['hotspots'].append({
                        'file': file_data['path'],
                        'complexity': file_data['complexity'],
                        'churn': file_data['churn'],
                        'score': file_data['complexity'] * file_data['churn']
                    })

        stats['summary']['scan_time'] = round(time.time() - start_time, 2)

        return stats

    def run_as_service(self):
        """作为子进程服务运行（Electron 集成模式）"""
        self.running = True

        # 发送就绪信号
        print(json.dumps({"type": "status", "msg": "ready"}), flush=True)

        # 消息循环
        while self.running:
            try:
                line = sys.stdin.readline()
                if not line:
                    break

                try:
                    req = json.loads(line)
                except json.JSONDecodeError:
                    continue

                req_id = req.get("id")
                cmd = req.get("command", "scan")

                if cmd == "scan":
                    self._handle_scan(req_id, req)
                elif cmd == "stop":
                    self.running = False
                    self._send_response(req_id, {"status": "stopped"})
                else:
                    self._send_error(req_id, f"Unknown command: {cmd}")

            except Exception as e:
                self._send_error(None, str(e))

    def _handle_scan(self, req_id, req):
        """处理扫描请求"""
        target_path = req.get("path")

        if not target_path or not os.path.exists(target_path):
            self._send_error(req_id, "Path not found")
            return

        try:
            options = req.get("options", {})
            result = self.scan_project(target_path, options)
            self._send_response(req_id, {"success": True, "data": result})
        except Exception as e:
            self._send_error(req_id, str(e))

    def _send_response(self, req_id, data):
        """发送响应"""
        response = {"id": req_id, **data}
        print(json.dumps(response), flush=True)

    def _send_error(self, req_id, error):
        """发送错误"""
        response = {"id": req_id, "success": False, "error": error}
        print(json.dumps(response), flush=True)

# ============================================================================
# 命令行入口
# ============================================================================
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='代码健康检查工具')
    parser.add_argument('path', help='项目路径')
    parser.add_argument('--mode', choices=['service', 'cli'], default='cli',
                        help='运行模式: service=子进程模式, cli=命令行模式')
    parser.add_argument('--report', action='store_true',
                        help='生成HTML报告')
    parser.add_argument('--no-git', action='store_true',
                        help='禁用Git分析')

    args = parser.parse_args()

    service = HealthCheckService()

    if args.mode == 'service':
        # 子进程模式（供 Electron 调用）
        service.run_as_service()
    else:
        # CLI 模式
        print(f"🔍 扫描项目: {args.path}")
        result = service.scan_project(args.path, {
            'enable_git': not args.no_git
        })

        print(f"\n📊 扫描完成！")
        print(f"  • 文件: {result['summary']['files']}")
        print(f"  • 代码行: {result['summary']['code_lines']}")
        print(f"  • 问题: {result['summary']['issues']}")
        print(f"  • 耗时: {result['summary']['scan_time']}s")

        if args.report:
            # 注意：这里的导入路径需要根据运行方式适配
            # 如果使用 python -m health_check.main 运行，则用相对导入
            try:
                from .reporters.html_reporter import generate_html_report
            except ImportError:
                # 如果直接 python main.py 运行，尝试绝对导入或调整路径
                # 这里为了简单，假设是作为模块运行
                from .reporters.html_reporter import generate_html_report

            report_path = generate_html_report(result)
            print(f"\n📄 报告已生成: {report_path}")

            # 自动打开
            import webbrowser
            webbrowser.open('file://' + report_path)