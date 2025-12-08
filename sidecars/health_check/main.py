# sidecars/health_check/main.py
import sys
import os
import json
import time

# [关键] 强制设置标准输出为 UTF-8，否则 Windows 下传给 Electron 的中文会乱码
sys.stdout.reconfigure(encoding='utf-8')

# 导入同目录下的模块
from config import IGNORE_DIRS, IGNORE_EXTS, LANG_MAP, FAT_FILE_THRESHOLD
from analyzer import FileAnalyzer
from utils import get_file_hash, format_size

# 尝试导入可选模块，如果没写好不报错
try:
    from git_ops import get_git_churn
except ImportError:
    def get_git_churn(path): return {}

try:
    from reporter import generate_html_report
except ImportError:
    def generate_html_report(data): return None


def scan_project(root_path):
    stats = {
        "summary": {
            "files": 0,       # 文件总数
            "lines": 0,       # 代码总行数
            "size": 0,        # 总大小 (Bytes)
            "scanTime": 0,    # 耗时 (秒)
            "issues": 0       # 发现的问题总数
        },
        "languages": {},      # 语言分布 { "Python": 1000, "TS": 500 }
        "hotspots": [],       # 热点文件 (高频修改 + 高复杂)
        "badSmells": [],      # 坏味道 (文件太大、嵌套太深)
        "secrets": [],        # 安全隐患
        "duplicates": [],     # 重复文件组
        "todos": [],          # 所有 TODO
        "files_data": []      # 所有文件的元数据 (用于前端绘图)
    }
    
    start_time = time.time()
    
    # 1. 获取 Git 变更频率 (Churn)
    # 这步可能会花一点点时间，但对于识别技术债至关重要
    git_churn_map = get_git_churn(root_path)
    
    # 用于查重的哈希表: { "md5_hash": ["file1", "file2"] }
    hash_map = {}

    # 2. 遍历文件系统
    for root, dirs, files in os.walk(root_path):
        # 过滤目录 (修改 dirs 列表会影响 os.walk 的后续递归)
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            # 过滤扩展名
            ext = os.path.splitext(file)[1].lower()
            if ext in IGNORE_EXTS:
                continue
                
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, root_path)
            
            # --- 基础信息收集 ---
            try:
                fsize = os.path.getsize(full_path)
                stats["summary"]["size"] += fsize
            except:
                continue # 文件可能被占用或删除了，跳过

            stats["summary"]["files"] += 1
            
            # --- 查重逻辑 ---
            # 计算文件哈希
            fhash = get_file_hash(full_path)
            if fhash:
                if fhash in hash_map:
                    hash_map[fhash].append(rel_path)
                else:
                    hash_map[fhash] = [rel_path]

            # --- 深度分析 ---
            analyzer = FileAnalyzer(full_path, rel_path)
            
            if analyzer.analyze():
                report = analyzer.get_report()
                
                # 获取该文件的 Git 修改次数
                # 注意路径分隔符：Git 输出通常是 '/', Windows 是 '\\'
                # 我们在 git_ops 里最好统一处理，或者这里 normalize
                norm_rel_path = rel_path.replace('\\', '/')
                churn = git_churn_map.get(norm_rel_path, 0)
                
                # 统计语言
                lang = LANG_MAP.get(ext, 'Other')
                if lang not in stats["languages"]:
                    stats["languages"][lang] = {"files": 0, "lines": 0, "code": 0}
                
                stats["languages"][lang]["files"] += 1
                stats["languages"][lang]["lines"] += report["lines"]
                stats["languages"][lang]["code"] += report["code"]
                
                stats["summary"]["lines"] += report["lines"]

                # 收集列表数据
                # 将文件内的 TODO/Secrets 加上文件路径信息，扁平化存入总表
                if report["todos"]:
                    stats["todos"].extend([{**t, "file": rel_path} for t in report["todos"]])
                
                if report["secrets"]:
                    stats["secrets"].extend([{**s, "file": rel_path} for s in report["secrets"]])
                
                # --- 智能诊断 ---
                
                # A. 识别"坏味道" (静态特征)
                issues = []
                if report["lines"] > FAT_FILE_THRESHOLD:
                    issues.append(f"文件过大 ({report['lines']} 行)")
                if report["complexity"] > 60: # 经验阈值
                    issues.append(f"逻辑太复杂 (分数 {report['complexity']})")
                if report["maxIndent"] > 6:
                    issues.append(f"嵌套过深 ({report['maxIndent']} 层)")
                
                if issues:
                    stats["badSmells"].append({
                        "file": rel_path,
                        "issues": issues,
                        "score": report["complexity"]
                    })

                # B. 识别"热点" (动态特征 + 静态特征)
                # 修改次数多(>5) 且 复杂度高(>20) 的文件就是技术债热点
                is_hotspot = report["complexity"] > 20 and churn > 5
                if is_hotspot:
                    stats["hotspots"].append({
                        "file": rel_path,
                        "complexity": report["complexity"],
                        "churn": churn,
                        "score": report["complexity"] * churn # 热度分数
                    })
                
                # 保存元数据供前端图表使用 (散点图)
                stats["files_data"].append({
                    "name": file,
                    "path": rel_path,
                    "lines": report["lines"],
                    "complexity": report["complexity"],
                    "churn": churn
                })

    # --- 后处理 ---

    # 1. 整理重复文件 (只保留列表长度 > 1 的)
    for k, v in hash_map.items():
        if len(v) > 1:
            stats["duplicates"].append(v)
            
    # 2. 统计汇总
    stats["summary"]["scanTime"] = round(time.time() - start_time, 2)
    stats["summary"]["sizeFormatted"] = format_size(stats["summary"]["size"])
    stats["summary"]["issues"] = len(stats["secrets"]) + len(stats["hotspots"]) + len(stats["badSmells"])
    
    # 3. 排序 (让前端拿到最有价值的数据在前)
    # 热点按 (复杂度 * 修改频率) 降序
    stats["hotspots"].sort(key=lambda x: x["score"], reverse=True)
    # 坏味道按 复杂度 降序
    stats["badSmells"].sort(key=lambda x: x["score"], reverse=True)
    
    return stats

def main():
    # 1. 发送握手信号，告诉父进程服务已启动
    print(json.dumps({"type": "status", "msg": "ready"}), flush=True)

    # 2. 进入消息循环
    while True:
        try:
            # 阻塞读取一行 (来自 Electron 的 stdin)
            line = sys.stdin.readline()
            if not line:
                break # EOF, 父进程关闭了管道，退出
            
            # 解析请求
            try:
                req = json.loads(line)
            except json.JSONDecodeError:
                continue

            req_id = req.get("id")
            target_path = req.get("path")
            generate_report = req.get("generateReport", False)

            # 校验
            if not target_path or not os.path.exists(target_path):
                error_res = {"id": req_id, "success": False, "error": "Path not found"}
                print(json.dumps(error_res), flush=True)
                continue

            # 执行核心逻辑
            result_data = scan_project(target_path)
            
            # 可选：生成 HTML 报告
            report_path = None
            if generate_report:
                report_path = generate_html_report(result_data)
            
            # 构造成功响应
            response = {
                "id": req_id,
                "success": True,
                "data": result_data,
                "reportPath": report_path
            }
            
            # 发送响应 (必须 flush)
            print(json.dumps(response), flush=True)

        except Exception as e:
            # 捕获所有未处理异常，防止服务崩溃
            # 实际生产中可以把 e 写入日志文件
            error_res = {"error": str(e)}
            print(json.dumps(error_res), flush=True)

if __name__ == "__main__":
    main()