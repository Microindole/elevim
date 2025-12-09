# ============================================================================
# sidecars/health_check/core/scanner.py
# ============================================================================
import os
from ..config import IGNORE_DIRS, IGNORE_FILES, IGNORE_EXTS, THRESHOLDS
from ..utils.file_utils import should_ignore, get_file_hash, format_size
from ..analyzers.metrics import MetricsAnalyzer
from ..analyzers.quality import QualityAnalyzer
from ..analyzers.security import SecurityAnalyzer
from ..analyzers.dependencies import DependencyAnalyzer
import sys


class ProjectScanner:
    """项目扫描器 - 协调所有分析器"""

    def __init__(self, root_path, config=None):
        self.root_path = root_path
        self.config = config or {}

        # 初始化分析器
        self.analyzers = {
            'metrics': MetricsAnalyzer(config),
            'quality': QualityAnalyzer(config),
            'security': SecurityAnalyzer(config),
            'dependencies': DependencyAnalyzer(config),
        }

    def scan(self):
        """执行完整扫描"""
        stats = {
            'summary': {
                'files': 0,
                'lines': 0,
                'code_lines': 0,
                'size': 0,
                'issues': 0
            },
            'languages': {},
            'hotspots': [],
            'bad_smells': [],
            'secrets': [],
            'risks': [],
            'todos': [],
            'duplicates': [],
            'dependencies': {
                'external': set(),
                'internal': set()
            },
            'files_data': []
        }

        hash_map = {}

        for root, dirs, files in os.walk(self.root_path):
            # 过滤目录
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, self.root_path)

                # 检查是否忽略
                if should_ignore(rel_path, IGNORE_DIRS, IGNORE_FILES, IGNORE_EXTS):
                    continue

                # 基础信息
                try:
                    fsize = os.path.getsize(full_path)
                    stats['summary']['size'] += fsize
                    stats['summary']['files'] += 1
                except:
                    continue

                # 查重
                fhash = get_file_hash(full_path)
                if fhash:
                    if fhash in hash_map:
                        hash_map[fhash].append(rel_path)
                    else:
                        hash_map[fhash] = [rel_path]

                # 读取文件内容
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                except:
                    continue

                # 执行所有分析器
                results = {}
                for name, analyzer in self.analyzers.items():
                    try:
                        results[name] = analyzer.analyze(full_path, rel_path, lines)
                    except Exception as e:
                        results[name] = {}

                # 聚合结果
                self._aggregate_results(stats, rel_path, file, results)

        # 后处理
        self._post_process(stats, hash_map)

        return stats

    def _aggregate_results(self, stats, rel_path, filename, results):
        """聚合分析结果"""
        metrics = results.get('metrics', {})
        quality = results.get('quality', {})
        security = results.get('security', {})
        deps = results.get('dependencies', {})

        # 语言统计
        from ..config import LANG_MAP
        ext = os.path.splitext(filename)[1].lower()
        lang = LANG_MAP.get(ext, 'Other')

        if lang not in stats['languages']:
            stats['languages'][lang] = {
                'files': 0,
                'lines': 0,
                'code': 0,
                'functions': 0
            }

        stats['languages'][lang]['files'] += 1
        stats['languages'][lang]['lines'] += metrics.get('lines', 0)
        stats['languages'][lang]['code'] += metrics.get('code_lines', 0)
        stats['languages'][lang]['functions'] += len(metrics.get('functions', []))

        stats['summary']['lines'] += metrics.get('lines', 0)
        stats['summary']['code_lines'] += metrics.get('code_lines', 0)

        # TODO 列表
        for todo in quality.get('todos', []):
            stats['todos'].append({**todo, 'file': rel_path})

        # 安全问题
        for secret in security.get('secrets', []):
            stats['secrets'].append({**secret, 'file': rel_path})

        for risk in security.get('risks', []):
            stats['risks'].append({**risk, 'file': rel_path})

        # 依赖
        stats['dependencies']['external'].update(deps.get('external_deps', []))
        stats['dependencies']['internal'].update(deps.get('internal_deps', []))

        # 坏味道检测
        issues = []
        lines = metrics.get('lines', 0)
        complexity = metrics.get('complexity', 0)
        max_indent = metrics.get('max_indent', 0)

        if lines > THRESHOLDS['fat_file']:
            issues.append(f"文件过大 ({lines} 行)")
        if complexity > 60:
            issues.append(f"逻辑复杂 (复杂度 {complexity})")
        if max_indent > THRESHOLDS['max_indent']:
            issues.append(f"嵌套过深 ({max_indent} 层)")

        # 长函数检测
        long_funcs = [f for f in metrics.get('functions', [])
                      if f.get('lines', 0) > THRESHOLDS['long_function']]
        if long_funcs:
            issues.append(f"{len(long_funcs)} 个长函数")

        # 注释率过低
        if metrics.get('comment_ratio', 0) < THRESHOLDS['low_comment_ratio'] and metrics.get('code_lines', 0) > 50:
            issues.append(f"注释不足 ({metrics.get('comment_ratio', 0)*100:.1f}%)")

        if issues:
            stats['bad_smells'].append({
                'file': rel_path,
                'issues': issues,
                'score': complexity,
                'lines': lines
            })

        # 元数据（供可视化）
        stats['files_data'].append({
            'name': filename,
            'path': rel_path,
            'lines': lines,
            'code': metrics.get('code_lines', 0),
            'complexity': complexity,
            'functions': len(metrics.get('functions', [])),
            'churn': 0  # 后续由 Git 填充
        })

    def _post_process(self, stats, hash_map):
        """后处理：排序、格式化"""
        # 重复文件
        for k, v in hash_map.items():
            if len(v) > 1:
                stats['duplicates'].append(v)

        # 转换集合为列表
        stats['dependencies']['external'] = sorted(list(stats['dependencies']['external']))
        stats['dependencies']['internal'] = sorted(list(stats['dependencies']['internal']))

        # 排序
        stats['bad_smells'].sort(key=lambda x: x['score'], reverse=True)
        stats['hotspots'].sort(key=lambda x: x.get('score', 0), reverse=True)

        # 统计问题数
        stats['summary']['issues'] = (
                len(stats['secrets']) +
                len(stats['risks']) +
                len(stats['bad_smells']) +
                len(stats['hotspots'])
        )

        stats['summary']['size_formatted'] = format_size(stats['summary']['size'])
