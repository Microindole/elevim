# ============================================================================
# sidecars/health_check/analyzers/metrics.py
# ============================================================================
import re
from .base import BaseAnalyzer
from ..config import COMPLEXITY_KEYWORDS, MAGIC_NUMBER_PATTERN, FUNCTION_PATTERNS
import os
import sys


class MetricsAnalyzer(BaseAnalyzer):
    """基础指标分析器：行数、复杂度、函数统计等"""

    def analyze(self, filepath, rel_path, content_lines):
        result = {
            'lines': 0,
            'code_lines': 0,
            'comment_lines': 0,
            'blank_lines': 0,
            'complexity': 0,
            'max_indent': 0,
            'functions': [],
            'magic_numbers': [],
        }

        current_function = None
        function_start = 0
        lang = self.get_language(filepath)

        # 选择函数匹配模式
        func_pattern = None
        if 'Python' in lang:
            func_pattern = FUNCTION_PATTERNS.get('python')
        elif 'Script' in lang or 'React' in lang:
            func_pattern = FUNCTION_PATTERNS.get('javascript')

        for i, line in enumerate(content_lines, 1):
            stripped = line.strip()
            result['lines'] += 1

            # 空行
            if not stripped:
                result['blank_lines'] += 1
                continue

            # 注释行（简单判断）
            if stripped.startswith(('//', '#', '*', '<!--', '/*')):
                result['comment_lines'] += 1
                continue

            result['code_lines'] += 1

            # 复杂度统计
            words = set(re.findall(r'\w+', stripped))
            score = len(words.intersection(COMPLEXITY_KEYWORDS))
            result['complexity'] += score

            # 缩进深度
            indent_level = (len(line) - len(line.lstrip())) // 4
            result['max_indent'] = max(result['max_indent'], indent_level)

            # 函数检测
            if func_pattern:
                match = func_pattern.match(line)
                if match:
                    # 保存上一个函数
                    if current_function:
                        current_function['lines'] = i - function_start
                        result['functions'].append(current_function)

                    # 开始新函数
                    current_function = {
                        'name': match.group(1),
                        'start': i,
                        'complexity': 0
                    }
                    function_start = i

            # 累计当前函数复杂度
            if current_function:
                current_function['complexity'] += score

            # 魔法数字检测
            magic_nums = MAGIC_NUMBER_PATTERN.findall(stripped)
            if magic_nums:
                # 排除常见的非魔法数字
                filtered = [n for n in magic_nums if n not in {'10', '100', '1000', '24', '60', '256', '512', '1024'}]
                if filtered:
                    result['magic_numbers'].append({
                        'line': i,
                        'numbers': filtered,
                        'preview': stripped[:60]
                    })

        # 保存最后一个函数
        if current_function:
            current_function['lines'] = result['lines'] - function_start
            result['functions'].append(current_function)

        # 计算注释率
        if result['lines'] > 0:
            result['comment_ratio'] = result['comment_lines'] / result['lines']
        else:
            result['comment_ratio'] = 0

        return result
