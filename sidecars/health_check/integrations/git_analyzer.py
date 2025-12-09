# ============================================================================
# sidecars/health_check/integrations/git_analyzer.py
# ============================================================================
import subprocess
import os

class GitAnalyzer:
    """Git 历史分析"""

    def __init__(self, root_path):
        self.root_path = root_path
        self.is_git_repo = os.path.exists(os.path.join(root_path, '.git'))

    def get_churn_map(self):
        """获取文件修改频率"""
        if not self.is_git_repo:
            return {}

        churn_map = {}
        try:
            process = subprocess.Popen(
                ['git', 'log', '--name-only', '--format='],
                cwd=self.root_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )
            stdout, _ = process.communicate(timeout=10)

            for line in stdout.split('\n'):
                line = line.strip()
                if line:
                    norm_path = line.replace('/', os.sep)
                    churn_map[norm_path] = churn_map.get(norm_path, 0) + 1
        except Exception:
            pass

        return churn_map

    def get_contributors(self, filepath):
        """获取文件贡献者"""
        if not self.is_git_repo:
            return []

        try:
            result = subprocess.run(
                ['git', 'log', '--format=%an', '--', filepath],
                cwd=self.root_path,
                capture_output=True,
                text=True,
                timeout=5
            )
            contributors = result.stdout.strip().split('\n')
            # 去重并统计
            contrib_count = {}
            for c in contributors:
                if c:
                    contrib_count[c] = contrib_count.get(c, 0) + 1
            return sorted(contrib_count.items(), key=lambda x: x[1], reverse=True)
        except Exception:
            return []
