import subprocess
import os
import sys

def is_git_repo(root_path):
    return os.path.exists(os.path.join(root_path, '.git'))

def get_git_churn(root_path):
    """
    计算每个文件的修改次数 (Churn)
    返回: { "src/main.ts": 15, "README.md": 2 }
    """
    churn_map = {}
    
    if not is_git_repo(root_path):
        return {}

    try:
        # 使用 git log --name-only --format='' 来获取所有提交涉及的文件名
        # 这是一个极其高效的命令
        process = subprocess.Popen(
            ['git', 'log', '--name-only', '--format='],
            cwd=root_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8', 
            errors='ignore' # 防止非utf-8文件名报错
        )
        stdout, _ = process.communicate()
        
        for line in stdout.split('\n'):
            line = line.strip()
            if line:
                # 统一路径分隔符
                norm_path = line.replace('/', os.sep).replace('\\', os.sep)
                churn_map[norm_path] = churn_map.get(norm_path, 0) + 1
                
    except Exception as e:
        # 如果没有安装 git 或出错，就静默失败，不影响主流程
        pass
        
    return churn_map