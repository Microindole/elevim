# ============================================================================
# sidecars/health_check/analyzers/security.py
# ============================================================================
from .base import BaseAnalyzer
from ..config import SECRET_PATTERNS, RISKY_PATTERNS
import os
import sys


class SecurityAnalyzer(BaseAnalyzer):
    """安全分析器：敏感信息、危险模式"""

    def analyze(self, filepath, rel_path, content_lines):
        result = {
            'secrets': [],
            'risks': [],
        }

        for i, line in enumerate(content_lines, 1):
            # 限制扫描长度
            if len(line) > 500:
                continue

            # 敏感信息扫描
            for name, pattern in SECRET_PATTERNS:
                if pattern.search(line):
                    result['secrets'].append({
                        'type': name,
                        'line': i,
                        'preview': line.strip()[:50] + "..."
                    })

            # 危险模式扫描
            for name, pattern in RISKY_PATTERNS:
                if pattern.search(line):
                    result['risks'].append({
                        'type': name,
                        'line': i,
                        'preview': line.strip()[:60]
                    })

        return result
