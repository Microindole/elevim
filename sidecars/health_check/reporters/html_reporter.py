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
