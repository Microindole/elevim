from config import SECRET_PATTERNS

def scan_for_secrets(line, line_num):
    """扫描单行是否存在敏感信息"""
    findings = []
    # 限制扫描长度，防止在一行超长的压缩代码里卡死
    if len(line) > 500: 
        return []
        
    for name, pattern in SECRET_PATTERNS:
        if pattern.search(line):
            # 为了安全，只返回脱敏后的信息或仅提示位置
            findings.append({
                "type": name,
                "line": line_num,
                "preview": line.strip()[:50] + "..." # 不要把完整的 key 存下来
            })
    return findings