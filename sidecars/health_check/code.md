# ============================================================================
# sidecars/health_check/__init__.py
# ============================================================================
"""
代码健康检查模块 - 主入口
可以作为独立脚本运行，也可以作为模块导入
"""

from .main import HealthCheckService

__version__ = "2.0.0"
__all__ = ["HealthCheckService"]


# ============================================================================
# sidecars/health_check/config.py
# ============================================================================
import re

# ===== 基础配置 =====
IGNORE_DIRS = {
'.git', 'node_modules', 'dist', 'build', 'coverage',
'__pycache__', '.idea', '.vscode', 'venv', '.ds_store',
'release', 'out', 'public', '.next', '.nuxt', 'target',
'vendor', 'tmp', 'temp', 'cache'
}

IGNORE_FILES = {
'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
'poetry.lock', 'Cargo.lock', 'go.sum',
'tsconfig.json', 'jsconfig.json'
}

IGNORE_EXTS = {
'.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
'.woff', '.woff2', '.ttf', '.eot', '.otf',
'.exe', '.dll', '.so', '.dylib', '.class', '.pyc',
'.zip', '.tar', '.gz', '.7z', '.rar', '.pdf', '.doc', '.docx',
'.mp4', '.avi', '.mov', '.mp3', '.wav'
}

# ===== 语言映射 =====
LANG_MAP = {
'.ts': 'TypeScript', '.tsx': 'React TS',
'.js': 'JavaScript', '.jsx': 'React JS',
'.py': 'Python',
'.rs': 'Rust',
'.go': 'Go',
'.java': 'Java',
'.c': 'C', '.cpp': 'C++', '.h': 'C/C++ Header',
'.cs': 'C#',
'.html': 'HTML', '.htm': 'HTML',
'.css': 'CSS', '.scss': 'SCSS', '.less': 'Less',
'.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.xml': 'XML',
'.md': 'Markdown', '.txt': 'Text',
'.vue': 'Vue', '.svelte': 'Svelte'
}

# ===== 质量阈值 =====
THRESHOLDS = {
'fat_file': 300,           # 文件过大
'huge_file': 500,          # 文件超大
'complex_function': 20,     # 函数复杂度
'max_indent': 6,            # 最大嵌套
'dangerous_indent': 8,      # 危险嵌套
'long_function': 50,        # 长函数
'magic_number': 3,          # 魔法数字警告阈值
'low_comment_ratio': 0.05,  # 注释率过低
}

# ===== 复杂度关键词 =====
COMPLEXITY_KEYWORDS = {
'if', 'else', 'elif', 'for', 'while', 'case', 'switch',
'catch', 'except', 'try', 'finally',
'&&', '||', 'and', 'or', '?', '??', '?.'
}

# ===== 模式匹配 =====
TODO_PATTERN = re.compile(
r'(TODO|FIXME|HACK|XXX|NOTE|REVIEW|BUG|DEPRECATED)\s*:?(.*)',
re.IGNORECASE
)

FUNCTION_PATTERNS = {
'python': re.compile(r'^\s*def\s+(\w+)\s*\('),
'javascript': re.compile(r'^\s*(?:async\s+)?(?:function\s+)?(\w+)\s*(?:=\s*)?(?:\([^)]*\)|async)?\s*(?:=>|{)'),
'typescript': re.compile(r'^\s*(?:async\s+)?(?:function\s+)?(\w+)\s*(?:=\s*)?(?:<[^>]+>)?\s*\([^)]*\)\s*(?::\s*\w+)?\s*(?:=>|{)'),
}

IMPORT_PATTERNS = {
'python': re.compile(r'^\s*(?:from\s+[\w.]+\s+)?import\s+([\w,\s]+)'),
'javascript': re.compile(r'^\s*import\s+(?:{[^}]+}|[\w*]+)\s+from\s+["\']([^"\']+)["\']'),
'typescript': re.compile(r'^\s*import\s+(?:type\s+)?(?:{[^}]+}|[\w*]+)\s+from\s+["\']([^"\']+)["\']'),
}

MAGIC_NUMBER_PATTERN = re.compile(r'\b(\d{2,})\b')  # 2位以上数字

# ===== 安全模式 =====
SECRET_PATTERNS = [
("AWS Access Key", re.compile(r'(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}')),
("Generic API Key", re.compile(r'(api_key|apikey|secret|token|password)\s*[:=]\s*["\'][a-zA-Z0-9_\-]{20,}["\']', re.IGNORECASE)),
("Private Key", re.compile(r'-----BEGIN\s+(RSA|DSA|EC|PGP|OPENSSH)\s+PRIVATE\s+KEY-----')),
("Hardcoded IP", re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b')),
("JWT Token", re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}')),
]

RISKY_PATTERNS = [
("eval() usage", re.compile(r'\beval\s*\(')),
("innerHTML assignment", re.compile(r'\.innerHTML\s*=')),
("SQL concatenation", re.compile(r'(SELECT|INSERT|UPDATE|DELETE).*\+.*', re.IGNORECASE)),
("Sync file operations", re.compile(r'\b(readFileSync|writeFileSync|execSync)\b')),
]


# ============================================================================
# sidecars/health_check/utils/file_utils.py
# ============================================================================
import os
import hashlib

def get_file_hash(filepath, full_hash=False, block_size=4096):
"""
计算文件哈希（默认快速模式，只读头尾）
full_hash=True 时计算完整哈希（用于精确查重）
"""
hasher = hashlib.md5()
try:
filesize = os.path.getsize(filepath)
with open(filepath, 'rb') as f:
if full_hash:
# 完整哈希
while chunk := f.read(block_size):
hasher.update(chunk)
else:
# 快速哈希：头 + 尾 + 大小
buf = f.read(block_size)
hasher.update(buf)
if filesize > block_size * 2:
f.seek(-block_size, 2)
buf = f.read(block_size)
hasher.update(buf)
hasher.update(str(filesize).encode('utf-8'))
return hasher.hexdigest()
except Exception:
return None


def format_size(size):
"""格式化文件大小"""
for unit in ['B', 'KB', 'MB', 'GB']:
if size < 1024:
return f"{size:.1f} {unit}"
size /= 1024
return f"{size:.1f} TB"


def should_ignore(path, ignore_dirs, ignore_files, ignore_exts):
"""判断是否应该忽略该路径"""
name = os.path.basename(path)

    # 检查文件名
    if name in ignore_files:
        return True
    
    # 检查扩展名
    ext = os.path.splitext(name)[1].lower()
    if ext in ignore_exts:
        return True
    
    # 检查路径中是否包含忽略目录
    parts = path.split(os.sep)
    if any(part in ignore_dirs for part in parts):
        return True
    
    return False


# ============================================================================
# sidecars/health_check/analyzers/base.py
# ============================================================================
from abc import ABC, abstractmethod

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


# ============================================================================
# sidecars/health_check/analyzers/metrics.py
# ============================================================================
import re
from .base import BaseAnalyzer
from ..config import COMPLEXITY_KEYWORDS, MAGIC_NUMBER_PATTERN, FUNCTION_PATTERNS

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


# ============================================================================
# sidecars/health_check/analyzers/security.py
# ============================================================================
from .base import BaseAnalyzer
from ..config import SECRET_PATTERNS, RISKY_PATTERNS

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


# ============================================================================
# sidecars/health_check/analyzers/dependencies.py
# ============================================================================
import re
from .base import BaseAnalyzer
from ..config import IMPORT_PATTERNS

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


# ============================================================================
# sidecars/health_check/main.py
# ============================================================================
import sys
import os
import json
import time

# 强制 UTF-8 输出
sys.stdout.reconfigure(encoding='utf-8')

from .core.scanner import ProjectScanner
from .integrations.git_analyzer import GitAnalyzer


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
# sidecars/health_check/reporters/html_reporter.py
# ============================================================================
import os
import json
import webbrowser

TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>代码健康检查报告 v2.0</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f7fa; 
            color: #333;
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }

        /* Header */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 32px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 14px; }
        
        /* Metrics Grid */
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            text-align: center;
            transition: transform 0.2s;
        }
        .metric-card:hover { transform: translateY(-4px); }
        .metric-card h2 { 
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .metric-card p { color: #666; font-size: 14px; }
        .metric-card.success h2 { color: #10b981; }
        .metric-card.warning h2 { color: #f59e0b; }
        .metric-card.danger h2 { color: #ef4444; }
        
        /* Cards Grid */
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .card.full-width { grid-column: 1 / -1; }
        .card h3 {
            font-size: 18px;
            margin-bottom: 15px;
            padding-left: 12px;
            border-left: 4px solid #667eea;
        }
        
        /* Table */
        .table-container {
            max-height: 400px;
            overflow-y: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        thead { 
            position: sticky;
            top: 0;
            background: #f9fafb;
            z-index: 10;
        }
        th {
            text-align: left;
            padding: 12px;
            font-weight: 600;
            border-bottom: 2px solid #e5e7eb;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #f3f4f6;
        }
        tr:hover { background: #f9fafb; }
        
        /* Badges */
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
        }
        .badge-danger { background: #fee2e2; color: #dc2626; }
        .badge-warning { background: #fef3c7; color: #d97706; }
        .badge-info { background: #dbeafe; color: #2563eb; }
        
        /* Charts */
        .chart { height: 350px; }
        
        /* Empty State */
        .empty {
            text-align: center;
            padding: 40px;
            color: #9ca3af;
        }
        .empty svg {
            width: 64px;
            height: 64px;
            margin-bottom: 10px;
            opacity: 0.3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 代码健康检查报告</h1>
            <p>扫描时间: {scan_time}s | 生成时间: {timestamp}</p>
        </div>

        <div class="metrics">
            <div class="metric-card">
                <h2>{total_files}</h2>
                <p>📁 文件总数</p>
            </div>
            <div class="metric-card">
                <h2>{total_lines}</h2>
                <p>📝 代码行数</p>
            </div>
            <div class="metric-card {issues_class}">
                <h2>{total_issues}</h2>
                <p>⚠️ 发现问题</p>
            </div>
            <div class="metric-card">
                <h2>{size_formatted}</h2>
                <p>💾 项目大小</p>
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🎨 语言分布</h3>
                <div id="langChart" class="chart"></div>
            </div>
            
            <div class="card">
                <h3>🛡️ 安全问题扫描</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>类型</th><th>位置</th><th>预览</th></tr>
                        </thead>
                        <tbody>{security_rows}</tbody>
                    </table>
                </div>
            </div>
            
            <div class="card full-width">
                <h3>💩 代码坏味道 Top 10</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>文件</th><th>问题</th><th>复杂度</th><th>行数</th></tr>
                        </thead>
                        <tbody>{bad_smells_rows}</tbody>
                    </table>
                </div>
            </div>
            
            <div class="card full-width">
                <h3>🔥 技术债热点图 (复杂度 vs 修改频率)</h3>
                <p style="font-size: 12px; color: #666; margin-bottom: 15px;">
                    右上角的文件：高频修改 + 高复杂度 = 优先重构目标
                </p>
                <div id="scatterChart" style="height: 500px;"></div>
            </div>
            
            <div class="card">
                <h3>📦 外部依赖</h3>
                <div class="table-container">
                    {dependencies_content}
                </div>
            </div>
            
            <div class="card">
                <h3>📋 待办事项 (TODO)</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>标签</th><th>文件</th><th>内容</th></tr>
                        </thead>
                        <tbody>{todos_rows}</tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const data = {data_json};
        
        // 语言饼图
        const langChart = echarts.init(document.getElementById('langChart'));
        const langData = Object.entries(data.languages).map(([name, info]) => ({
            value: info.code,
            name: `${name} (${info.files})`
        }));
        
        langChart.setOption({
            tooltip: { 
                trigger: 'item',
                formatter: '{b}: {c} 行 ({d}%)'
            },
            series: [{
                type: 'pie',
                radius: ['45%', '75%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 8,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: { show: true, fontSize: 12 },
                data: langData
            }]
        });
        
        // 散点图
        const scatterChart = echarts.init(document.getElementById('scatterChart'));
        const scatterData = data.files_data.map(f => [
            f.churn, 
            f.complexity, 
            f.name, 
            f.path, 
            f.lines
        ]);
        
        scatterChart.setOption({
            tooltip: {
                formatter: function(param) {
                    return `<b>${param.data[2]}</b><br/>` +
                           `路径: ${param.data[3]}<br/>` +
                           `修改次数: ${param.data[0]}<br/>` +
                           `复杂度: ${param.data[1]}<br/>` +
                           `行数: ${param.data[4]}`;
                }
            },
            grid: { left: 60, right: 40, top: 60, bottom: 40 },
            xAxis: { 
                name: '修改频率', 
                nameLocation: 'middle',
                nameGap: 25,
                type: 'value',
                splitLine: { lineStyle: { type: 'dashed', opacity: 0.3 } }
            },
            yAxis: { 
                name: '复杂度',
                nameLocation: 'middle',
                nameGap: 40,
                type: 'value',
                splitLine: { lineStyle: { type: 'dashed', opacity: 0.3 } }
            },
            visualMap: {
                min: 0,
                max: Math.max(...scatterData.map(d => d[1])),
                dimension: 1,
                orient: 'horizontal',
                right: 10,
                top: 10,
                text: ['高风险', '低风险'],
                inRange: { color: ['#91cc75', '#fac858', '#ee6666'] }
            },
            series: [{
                type: 'scatter',
                symbolSize: function(data) {
                    return Math.max(8, Math.min(40, Math.sqrt(data[4]) / 2));
                },
                data: scatterData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        });
        
        window.addEventListener('resize', () => {
            langChart.resize();
            scatterChart.resize();
        });
    </script>
</body>
</html>"""


def generate_html_report(data, output_path="health_report.html"):
"""生成 HTML 报告"""
from datetime import datetime

    # 处理安全问题
    security_rows = ""
    if data['secrets'] or data['risks']:
        all_security = data['secrets'] + data['risks']
        for item in all_security[:20]:  # 最多显示20个
            security_rows += f"""
                <tr>
                    <td><span class="badge badge-danger">{item['type']}</span></td>
                    <td><code style="font-size:11px">{item['file']}:{item['line']}</code></td>
                    <td style="font-family:monospace;font-size:11px;color:#666">{item['preview'][:50]}...</td>
                </tr>
            """
    else:
        security_rows = '<tr><td colspan="3" class="empty">🎉 未发现安全问题</td></tr>'
    
    # 处理坏味道
    bad_smells_rows = ""
    for smell in data['bad_smells'][:10]:
        issues_str = "<br>".join([f"• {issue}" for issue in smell['issues']])
        bad_smells_rows += f"""
            <tr>
                <td><code style="font-size:11px">{smell['file']}</code></td>
                <td style="font-size:12px">{issues_str}</td>
                <td><span class="badge badge-warning">{smell['score']}</span></td>
                <td>{smell['lines']}</td>
            </tr>
        """
    if not bad_smells_rows:
        bad_smells_rows = '<tr><td colspan="4" class="empty">✨ 代码质量良好</td></tr>'
    
    # 依赖列表
    deps = data['dependencies']['external']
    if deps:
        deps_list = "".join([f"<div style='padding:4px 0'><code>{dep}</code></div>" for dep in deps[:30]])
        dependencies_content = f'<div style="max-height:300px;overflow-y:auto">{deps_list}</div>'
    else:
        dependencies_content = '<p class="empty">无外部依赖</p>'
    
    # TODO 列表
    todos_rows = ""
    for todo in data['todos'][:20]:
        todos_rows += f"""
            <tr>
                <td><span class="badge badge-info">{todo['tag']}</span></td>
                <td><code style="font-size:11px">{todo['file']}:{todo['line']}</code></td>
                <td style="font-size:12px">{todo['text'][:60]}</td>
            </tr>
        """
    if not todos_rows:
        todos_rows = '<tr><td colspan="3" class="empty">无待办事项</td></tr>'
    
    # 问题等级
    total_issues = data['summary']['issues']
    if total_issues == 0:
        issues_class = "success"
    elif total_issues < 10:
        issues_class = "warning"
    else:
        issues_class = "danger"
    
    # 填充模板
    html = TEMPLATE.format(
        scan_time=data['summary']['scan_time'],
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        total_files=data['summary']['files'],
        total_lines=data['summary']['lines'],
        total_issues=total_issues,
        issues_class=issues_class,
        size_formatted=data['summary']['size_formatted'],
        security_rows=security_rows,
        bad_smells_rows=bad_smells_rows,
        dependencies_content=dependencies_content,
        todos_rows=todos_rows,
        data_json=json.dumps(data)
    )
    
    # 写入文件
    full_path = os.path.abspath(output_path)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    return full_path


# ============================================================================
# 命令行入口（独立运行）
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
            from .reporters.html_reporter import generate_html_report
            report_path = generate_html_report(result)
            print(f"\n📄 报告已生成: {report_path}")
            
            # 自动打开
            import webbrowser
            webbrowser.open('file://' + report_path)