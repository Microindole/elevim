import os
import webbrowser
import json

def generate_html_report(data, output_path="report.html"):
    # 为了简化，我们把数据直接注入到 JS 变量里
    json_data = json.dumps(data)
    
    html = f"""
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <title>Elevim 代码体检报告 v2.0</title>
        <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
        <style>
            body {{ font-family: 'Segoe UI', sans-serif; background: #f0f2f5; margin: 0; padding: 20px; }}
            .header {{ background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; }}
            .metric {{ text-align: center; }}
            .metric h2 {{ margin: 0; color: #1890ff; font-size: 28px; }}
            .metric p {{ margin: 5px 0 0; color: #666; }}
            
            .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
            .card {{ background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
            .full-width {{ grid-column: 1 / -1; }}
            
            h3 {{ border-left: 4px solid #1890ff; padding-left: 10px; margin-top: 0; }}
            
            .table-container {{ max-height: 400px; overflow-y: auto; }}
            table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
            th {{ position: sticky; top: 0; background: #fff; text-align: left; padding: 10px; border-bottom: 2px solid #eee; }}
            td {{ padding: 8px 10px; border-bottom: 1px solid #f5f5f5; }}
            tr:hover {{ background: #fafafa; }}
            
            .tag-risk {{ background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e; padding: 2px 5px; border-radius: 4px; font-size: 12px; }}
            .tag-safe {{ background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; padding: 2px 5px; border-radius: 4px; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="metric"><h2>{data['summary']['files']}</h2><p>文件总数</p></div>
            <div class="metric"><h2>{data['summary']['lines']}</h2><p>代码行数</p></div>
            <div class="metric"><h2 style="color: #ff4d4f">{len(data['hotspots'])}</h2><p>高危热点文件</p></div>
            <div class="metric"><h2 style="color: #faad14">{len(data['secrets'])}</h2><p>安全隐患</p></div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>语言构成</h3>
                <div id="langChart" style="height: 300px;"></div>
            </div>

            <div class="card">
                <h3>🛡️ 安全隐患扫描</h3>
                <div class="table-container">
                    <table>
                        <thead><tr><th>类型</th><th>位置</th><th>预览</th></tr></thead>
                        <tbody>
                            {''.join([f"<tr><td><span class='tag-risk'>{s['type']}</span></td><td>{s['file']}:{s['line']}</td><td style='font-family:monospace;color:#666'>{s['preview']}</td></tr>" for s in data['secrets']])}
                            {'<tr><td colspan="3" style="text-align:center;color:#999">🎉 没有发现敏感信息</td></tr>' if not data['secrets'] else ''}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card full-width">
                <h3>🔥 技术债热点图 (Complexity vs. Churn)</h3>
                <p style="font-size:12px; color:#666; margin-bottom:10px;">
                    越靠右上方，表示文件修改越频繁且越复杂，是重构的首选目标。
                </p>
                <div id="scatterChart" style="height: 500px;"></div>
            </div>
        </div>

        <script>
            const data = {json_data};

            // 1. 饼图
            const langChart = echarts.init(document.getElementById('langChart'));
            langChart.setOption({{
                tooltip: {{ trigger: 'item' }},
                series: [{{
                    type: 'pie',
                    radius: ['40%', '70%'],
                    data: Object.entries(data.languages).map(([k, v]) => ({{ value: v, name: k }}))
                }}]
            }});

            // 2. 散点图
            const scatterChart = echarts.init(document.getElementById('scatterChart'));
            
            // 转换数据 [churn, complexity, name, path, lines]
            const scatterData = data.files_data.map(f => [f.churn, f.complexity, f.name, f.path, f.lines]);

            scatterChart.setOption({{
                tooltip: {{
                    formatter: function (param) {{
                        return `<b>${{param.data[2]}}</b><br/>` + 
                               `路径: ${{param.data[3]}}<br/>` +
                               `修改次数 (Churn): ${{param.data[0]}}<br/>` +
                               `复杂度: ${{param.data[1]}}<br/>` + 
                               `行数: ${{param.data[4]}}`;
                    }}
                }},
                xAxis: {{ name: '修改频率 (Churn)', type: 'value', splitLine: {{ show: false }} }},
                yAxis: {{ name: '复杂度', type: 'value', splitLine: {{ show: false }} }},
                visualMap: {{
                    min: 0,
                    max: 100, // 假设最大复杂度，可动态计算
                    dimension: 1,
                    orient: 'horizontal',
                    right: 10,
                    top: 10,
                    text: ['High Risk', 'Low Risk'],
                    calculable: true,
                    inRange: {{ color: ['#91cc75', '#fac858', '#ee6666'] }}
                }},
                series: [{{
                    type: 'scatter',
                    symbolSize: function (data) {{
                        // 气泡大小跟行数有关，限制在 5-30 之间
                        return Math.max(5, Math.min(30, Math.sqrt(data[4]) / 2));
                    }},
                    data: scatterData
                }}]
            }});

            window.onresize = function() {{
                langChart.resize();
                scatterChart.resize();
            }};
        </script>
    </body>
    </html>
    """
    
    full_path = os.path.abspath(output_path)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    webbrowser.open('file://' + full_path)
    return full_path