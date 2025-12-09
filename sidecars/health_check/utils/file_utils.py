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

