# config.py
import re

# 忽略的目录
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
    'tsconfig.json', 'jsconfig.json' # 配置文件通常不需要扫描复杂度
}

# 修改 IGNORE_DIRS，确保更全
IGNORE_DIRS = {
    '.git', 'node_modules', 'dist', 'build', 'coverage', 
    '__pycache__', '.idea', '.vscode', 'venv', '.ds_store',
    'release', 'out', 'public' # 增加 Electron 常见的构建目录
}

# 忽略的二进制/图片后缀
IGNORE_EXTS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.exe', '.dll', '.so', '.dylib', '.class', '.pyc',
    '.zip', '.tar', '.gz', '.7z', '.rar', '.pdf', '.doc', '.docx'
}

# 语言映射表
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
    '.md': 'Markdown', '.txt': 'Text'
}

# 复杂度阈值 (超过这个行数被认为是"胖"文件)
FAT_FILE_THRESHOLD = 300

# 敏感信息正则匹配规则
SECRET_PATTERNS = [
    ("AWS Access Key", re.compile(r'(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}')),
    ("Generic API Key", re.compile(r'(api_key|apikey|secret|token|password)\s*[:=]\s*["\'][a-zA-Z0-9_\-]{20,}["\']', re.IGNORECASE)),
    ("Private Key", re.compile(r'-----BEGIN\s+(RSA|DX|EC|PGP|Tv)\s+PRIVATE\s+KEY-----')),
    ("Hardcoded IP", re.compile(r'https?://(?:[0-9]{1,3}\.){3}[0-9]{1,3}')), # 简单的 IP 扫描
]