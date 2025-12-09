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
