// ============================================================================
// src/main/lib/health-check-service.ts - Electron 主进程集成
// ============================================================================
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';

export interface HealthCheckOptions {
enableGit?: boolean;
enableDependencies?: boolean;
}

export interface HealthCheckResult {
success: boolean;
data?: any;
error?: string;
}

export class HealthCheckService {
private process: ChildProcess | null = null;
private requestId = 0;
private pendingRequests = new Map<string, {
resolve: (value: any) => void;
reject: (reason: any) => void;
}>();

private pythonPath: string;
private scriptPath: string;

constructor() {
// 根据打包状态确定路径
const isDev = !app.isPackaged;

    if (isDev) {
      this.pythonPath = 'python'; // 开发环境使用系统 Python
      this.scriptPath = path.join(__dirname, '../../../sidecars/health_check/main.py');
    } else {
      // 生产环境：假设 Python 和脚本打包在 resources 目录
      this.pythonPath = path.join(process.resourcesPath, 'python', 'python.exe');
      this.scriptPath = path.join(process.resourcesPath, 'sidecars', 'health_check', 'main.py');
    }
}

/**
* 启动 Python 子进程
  */
  async start(): Promise<void> {
  if (this.process) {
  return; // 已启动
  }

    return new Promise((resolve, reject) => {
      this.process = spawn(this.pythonPath, [this.scriptPath, '--mode', 'service'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      
      // 处理标准输出（JSON 响应）
      let buffer = '';
      this.process.stdout!.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留未完成的行
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const msg = JSON.parse(line);
            this.handleMessage(msg);
          } catch (err) {
            console.error('[HealthCheck] Parse error:', err, 'Line:', line);
          }
        }
      });
      
      // 处理标准错误
      this.process.stderr!.on('data', (data) => {
        console.error('[HealthCheck] Error:', data.toString());
      });
      
      // 进程退出
      this.process.on('exit', (code) => {
        console.log(`[HealthCheck] Process exited with code ${code}`);
        this.process = null;
        
        // 拒绝所有待处理的请求
        for (const [id, { reject }] of this.pendingRequests) {
          reject(new Error('Process terminated'));
        }
        this.pendingRequests.clear();
      });
      
      // 等待就绪信号
      const readyTimeout = setTimeout(() => {
        reject(new Error('Python service startup timeout'));
      }, 10000);
      
      const checkReady = (msg: any) => {
        if (msg.type === 'status' && msg.msg === 'ready') {
          clearTimeout(readyTimeout);
          this.process!.stdout!.removeListener('data', checkReady);
          resolve();
        }
      };
      
      this.process.stdout!.on('data', (data) => {
        try {
          const msg = JSON.parse(data.toString().trim());
          checkReady(msg);
        } catch {}
      });
    });
}

/**
* 停止服务
  */
  stop(): void {
  if (this.process) {
  this.sendCommand('stop', {});
  this.process.kill();
  this.process = null;
  }
  }

/**
* 扫描项目
  */
  async scanProject(
  projectPath: string,
  options: HealthCheckOptions = {}
  ): Promise<HealthCheckResult> {
  if (!this.process) {
  await this.start();
  }

    return this.sendCommand('scan', {
      path: projectPath,
      options: {
        enable_git: options.enableGit ?? true,
        enable_dependencies: options.enableDependencies ?? true,
      }
    });
}

/**
* 发送命令并等待响应
  */
  private sendCommand(command: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
  const id = `req_${++this.requestId}`;

  this.pendingRequests.set(id, { resolve, reject });

  const request = {
  id,
  command,
  ...params
  };

  this.process!.stdin!.write(JSON.stringify(request) + '\n');

  // 超时处理
  setTimeout(() => {
  if (this.pendingRequests.has(id)) {
  this.pendingRequests.delete(id);
  reject(new Error('Request timeout'));
  }
  }, 60000); // 60秒超时
  });
  }

/**
* 处理来自 Python 的消息
  */
  private handleMessage(msg: any): void {
  const { id, success, data, error } = msg;

    if (!id) return;
    
    const pending = this.pendingRequests.get(id);
    if (!pending) return;
    
    this.pendingRequests.delete(id);
    
    if (success) {
      pending.resolve(data);
    } else {
      pending.reject(new Error(error || 'Unknown error'));
    }
}
}

// 单例
let instance: HealthCheckService | null = null;

export function getHealthCheckService(): HealthCheckService {
if (!instance) {
instance = new HealthCheckService();
}
return instance;
}


// ============================================================================
// src/main/ipc-handlers/health-check.handlers.ts - IPC 处理器
// ============================================================================
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getHealthCheckService } from '../lib/health-check-service';

export function registerHealthCheckHandlers() {
const service = getHealthCheckService();

// 扫描项目
ipcMain.handle('health-check:scan', async (
event: IpcMainInvokeEvent,
projectPath: string,
options?: any
) => {
try {
const result = await service.scanProject(projectPath, options);
return { success: true, data: result };
} catch (error: any) {
return { success: false, error: error.message };
}
});

// 停止服务
ipcMain.handle('health-check:stop', async () => {
service.stop();
return { success: true };
});
}


// ============================================================================
// src/main/preload.ts - 预加载脚本（添加）
// ============================================================================
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('healthCheck', {
scan: (projectPath: string, options?: any) =>
ipcRenderer.invoke('health-check:scan', projectPath, options),
stop: () =>
ipcRenderer.invoke('health-check:stop'),
});


// ============================================================================
// src/renderer/features/health-check/types.ts - 渲染进程类型定义
// ============================================================================
export interface HealthCheckSummary {
files: number;
lines: number;
code_lines: number;
size: number;
size_formatted: string;
issues: number;
scan_time: number;
}

export interface LanguageStats {
files: number;
lines: number;
code: number;
functions: number;
}

export interface BadSmell {
file: string;
issues: string[];
score: number;
lines: number;
}

export interface SecurityIssue {
type: string;
file: string;
line: number;
preview: string;
}

export interface Hotspot {
file: string;
complexity: number;
churn: number;
score: number;
}

export interface HealthCheckData {
summary: HealthCheckSummary;
languages: Record<string, LanguageStats>;
bad_smells: BadSmell[];
secrets: SecurityIssue[];
risks: SecurityIssue[];
hotspots: Hotspot[];
todos: any[];
duplicates: string[][];
dependencies: {
external: string[];
internal: string[];
};
files_data: any[];
}


// ============================================================================
// src/renderer/features/health-check/hooks/useHealthCheck.ts - React Hook
// ============================================================================
import { useState } from 'react';
import { HealthCheckData } from '../types';

export function useHealthCheck() {
const [loading, setLoading] = useState(false);
const [data, setData] = useState<HealthCheckData | null>(null);
const [error, setError] = useState<string | null>(null);

const scan = async (projectPath: string, options?: any) => {
setLoading(true);
setError(null);

    try {
      const result = await window.healthCheck.scan(projectPath, options);
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Scan failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
};

return {
loading,
data,
error,
scan
};
}


// ============================================================================
// src/renderer/features/health-check/components/HealthCheckPanel.tsx - UI 组件
// ============================================================================
import React, { useState } from 'react';
import { useHealthCheck } from '../hooks/useHealthCheck';
import './HealthCheckPanel.css';

export const HealthCheckPanel: React.FC = () => {
const { loading, data, error, scan } = useHealthCheck();
const [projectPath, setProjectPath] = useState('');

const handleScan = () => {
if (projectPath) {
scan(projectPath);
}
};

const handleSelectFolder = async () => {
const result = await window.electron.dialog.showOpenDialog({
properties: ['openDirectory']
});

    if (!result.canceled && result.filePaths[0]) {
      setProjectPath(result.filePaths[0]);
    }
};

return (
<div className="health-check-panel">
<div className="header">
<h2>📊 代码健康检查</h2>
<p>分析项目质量、安全性和技术债</p>
</div>

      <div className="controls">
        <div className="input-group">
          <input
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="输入项目路径..."
          />
          <button onClick={handleSelectFolder}>选择文件夹</button>
        </div>
        
        <button 
          onClick={handleScan} 
          disabled={loading || !projectPath}
          className="scan-button"
        >
          {loading ? '扫描中...' : '开始扫描'}
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}
      
      {data && (
        <div className="results">
          <div className="summary">
            <div className="metric">
              <h3>{data.summary.files}</h3>
              <p>文件</p>
            </div>
            <div className="metric">
              <h3>{data.summary.code_lines.toLocaleString()}</h3>
              <p>代码行</p>
            </div>
            <div className="metric warning">
              <h3>{data.summary.issues}</h3>
              <p>问题</p>
            </div>
            <div className="metric">
              <h3>{data.summary.scan_time}s</h3>
              <p>耗时</p>
            </div>
          </div>
          
          <div className="sections">
            {/* 语言分布 */}
            <section>
              <h3>语言分布</h3>
              <div className="language-list">
                {Object.entries(data.languages).map(([lang, stats]) => (
                  <div key={lang} className="language-item">
                    <span className="lang-name">{lang}</span>
                    <span className="lang-stats">
                      {stats.files} 文件 · {stats.code.toLocaleString()} 行
                    </span>
                  </div>
                ))}
              </div>
            </section>
            
            {/* 坏味道 */}
            {data.bad_smells.length > 0 && (
              <section>
                <h3>代码坏味道 Top 10</h3>
                <div className="bad-smells-list">
                  {data.bad_smells.slice(0, 10).map((smell, idx) => (
                    <div key={idx} className="smell-item">
                      <div className="smell-file">{smell.file}</div>
                      <div className="smell-issues">
                        {smell.issues.map((issue, i) => (
                          <span key={i} className="issue-tag">{issue}</span>
                        ))}
                      </div>
                      <div className="smell-score">复杂度: {smell.score}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            {/* 安全问题 */}
            {(data.secrets.length > 0 || data.risks.length > 0) && (
              <section className="danger">
                <h3>🔒 安全问题</h3>
                <div className="security-list">
                  {[...data.secrets, ...data.risks].slice(0, 10).map((issue, idx) => (
                    <div key={idx} className="security-item">
                      <span className="issue-type">{issue.type}</span>
                      <span className="issue-location">
                        {issue.file}:{issue.line}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
);
};


// ============================================================================
// 使用示例 - 在主窗口中添加健康检查面板
// ============================================================================
// src/renderer/App.tsx
import { HealthCheckPanel } from './features/health-check/components/HealthCheckPanel';

function App() {
return (
<div className="app">
{/* 其他组件... */}
<HealthCheckPanel />
</div>
);
}