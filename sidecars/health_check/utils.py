# utils.py
import hashlib
import os

def get_file_hash(filepath, block_size=4096):
    """计算文件的快速指纹 (只读头尾，速度极快)"""
    hasher = hashlib.md5()
    try:
        filesize = os.path.getsize(filepath)
        with open(filepath, 'rb') as f:
            # 读开头
            buf = f.read(block_size)
            hasher.update(buf)
            # 如果文件很大，跳到末尾再读一块
            if filesize > block_size * 2:
                f.seek(-block_size, 2)
                buf = f.read(block_size)
                hasher.update(buf)
            # 把文件大小也加入哈希，避免碰巧头尾一样
            hasher.update(str(filesize).encode('utf-8'))
        return hasher.hexdigest()
    except Exception:
        return None

def format_size(size):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"