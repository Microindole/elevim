# ============================================================================
# sidecars/health_check/analyzers/quality.py
# ============================================================================
from .base import BaseAnalyzer
from ..config import THRESHOLDS, TODO_PATTERN

class QualityAnalyzer(BaseAnalyzer):
    """代码质量分析器：坏味道、TODO、命名规范等"""

    def analyze(self, filepath, rel_path, content_lines):
        result = {
            'issues': [],
            'todos': [],
            'naming_issues': [],
        }

        for i, line in enumerate(content_lines, 1):
            stripped = line.strip()
            if not stripped:
                continue

            # TODO 扫描
            match = TODO_PATTERN.search(line)
            if match:
                tag, content = match.groups()
                result['todos'].append({
                    'line': i,
                    'tag': tag.upper(),
                    'text': content.strip()[:100]
                })

            # 命名检查（简单版：查找可疑的单字母变量，排除循环变量）
            if not any(keyword in stripped for keyword in ['for', 'while']):
                single_chars = re.findall(r'\b([a-z])\s*=', stripped)
                if single_chars and len(single_chars) > 2:
                    result['naming_issues'].append({
                        'line': i,
                        'issue': 'Too many single-letter variables',
                        'preview': stripped[:60]
                    })

        return result
