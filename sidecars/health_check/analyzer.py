# sidecars/health_check/analyzer.py
import re
from config import FAT_FILE_THRESHOLD

# 尝试导入安全扫描模块，如果还没写好 security.py，就用一个空函数代替，防止报错
try:
    from security import scan_for_secrets
except ImportError:
    def scan_for_secrets(line, i): return []

# 复杂度关键词：出现这些词通常意味着代码有分支或循环
COMPLEXITY_KEYWORDS = {
    'if', 'else', 'elif', 'for', 'while', 'case', 'switch', 
    'catch', 'except', 'try', 'finally', 
    '&&', '||', 'and', 'or', '?', '??'
}

# TODO 扫描正则 (支持多种常见标记)
TODO_PATTERN = re.compile(r'(TODO|FIXME|HACK|XXX|NOTE|REVIEW|BUG)\s*:?(.*)', re.IGNORECASE)

class FileAnalyzer:
    def __init__(self, filepath, rel_path):
        """
        :param filepath: 文件的绝对路径 (用于读取)
        :param rel_path: 文件的相对路径 (用于报告显示)
        """
        self.filepath = filepath
        self.rel_path = rel_path
        
        # 统计数据
        self.lines = 0          # 总行数
        self.code_lines = 0     # 代码行数 (非空、非注释)
        self.complexity = 0     # 复杂度得分
        self.max_indent = 0     # 最大缩进深度
        
        # 发现的问题
        self.todos = []         # 待办事项列表
        self.secrets = []       # 安全隐患列表

    def analyze(self):
        """执行分析，成功返回 True，失败 (如二进制文件) 返回 False"""
        try:
            # 使用 utf-8 读取，忽略编码错误 (防止特殊字符导致崩溃)
            with open(self.filepath, 'r', encoding='utf-8', errors='ignore') as f:
                # 使用 enumerate 获取行号 (从0开始，所以后面 +1)
                for i, line in enumerate(f):
                    stripped = line.strip()
                    self.lines += 1
                    
                    # 1. 跳过空行
                    if not stripped:
                        continue
                        
                    # 2. 简单跳过注释 (支持 C系/JS/TS/Java/Rust 的 // 和 Python/Shell 的 #)
                    # 注意：这只是简单过滤，不处理行内注释或多行注释块，对于统计"规模"足够了
                    if stripped.startswith(('/', '*', '#')):
                        continue 
                    
                    self.code_lines += 1
                    
                    # 3. 估算复杂度 (Cyclomatic Complexity Proxy)
                    # 将行拆分为单词，计算关键词出现的次数
                    # 正则 \w+ 匹配单词字符
                    words = set(re.findall(r'\w+', stripped))
                    # 统计这一行里有多少个控制流关键词
                    # 比如 "if (a or b)" 会增加 2 点复杂度
                    score = len(words.intersection(COMPLEXITY_KEYWORDS))
                    self.complexity += score
                    
                    # 4. 估算嵌套深度 (Indentation)
                    # 计算行首空格数，假设 1个 Tab 或 4个空格 为一级
                    # (len(line) - len(line.lstrip())) 得到前导空白字符长度
                    indent_level = (len(line) - len(line.lstrip())) // 4
                    self.max_indent = max(self.max_indent, indent_level)
                    
                    # 惩罚深层嵌套：如果缩进超过 5 层，额外增加复杂度分数
                    if indent_level > 5:
                        self.complexity += 1

                    # 5. 扫描 TODO/FIXME
                    match = TODO_PATTERN.search(line)
                    if match:
                        tag, content = match.groups()
                        self.todos.append({
                            "line": i + 1,
                            "tag": tag.upper(),
                            "text": content.strip()[:100] # 限制长度
                        })

                    # 6. 安全扫描 (调用 security 模块)
                    secrets_found = scan_for_secrets(line, i + 1)
                    if secrets_found:
                        self.secrets.extend(secrets_found)
                        
            return True
            
        except Exception as e:
            # print(f"Error analyzing {self.filepath}: {e}") # 调试用
            return False

    def get_report(self):
        """返回该文件的分析结果字典"""
        return {
            "path": self.rel_path,
            "lines": self.lines,
            "code": self.code_lines,
            "complexity": self.complexity,
            "maxIndent": self.max_indent,
            "todos": self.todos,
            "secrets": self.secrets
        }