# ============================================================================
# sidecars/health_check/analyzers/base.py
# ============================================================================
from abc import ABC, abstractmethod
import os
import sys


class BaseAnalyzer(ABC):
    """分析器基类"""

    def __init__(self, config=None):
        self.config = config or {}

    @abstractmethod
    def analyze(self, filepath, rel_path, content_lines):
        """
        分析文件
        返回: dict 格式的分析结果
        """
        pass

    def get_language(self, filepath):
        """根据文件扩展名获取语言"""
        from ..config import LANG_MAP
        ext = os.path.splitext(filepath)[1].lower()
        return LANG_MAP.get(ext, 'Other')

