# ============================================================================
# sidecars/health_check/analyzers/dependencies.py
# ============================================================================
import re
from .base import BaseAnalyzer
from ..config import IMPORT_PATTERNS
import os
import sys


class DependencyAnalyzer(BaseAnalyzer):
    """依赖分析器：import 语句、模块依赖"""

    def analyze(self, filepath, rel_path, content_lines):
        result = {
            'imports': [],
            'external_deps': set(),
            'internal_deps': set(),
        }

        lang = self.get_language(filepath)
        pattern = None

        if 'Python' in lang:
            pattern = IMPORT_PATTERNS.get('python')
        elif 'Script' in lang or 'React' in lang:
            pattern = IMPORT_PATTERNS.get('javascript')

        if not pattern:
            return result

        for i, line in enumerate(content_lines, 1):
            match = pattern.search(line)
            if match:
                imported = match.group(1)
                result['imports'].append({
                    'line': i,
                    'module': imported
                })

                # 区分内外部依赖
                if imported.startswith('.'):
                    result['internal_deps'].add(imported)
                else:
                    result['external_deps'].add(imported.split('/')[0])

        # 转为列表以便JSON序列化
        result['external_deps'] = list(result['external_deps'])
        result['internal_deps'] = list(result['internal_deps'])

        return result
