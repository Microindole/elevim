// src/renderer/lib/lsp-plugin.ts
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { setDiagnostics, Diagnostic } from "@codemirror/lint";
import { URI } from 'vscode-uri'; // 引入 vscode-uri

// 导出保存通知辅助函数
export function notifyLspDidSave(filePath: string, languageId: string) {
    const uri = URI.file(filePath).toString();
    window.electronAPI.lsp.send(languageId, {
        method: 'textDocument/didSave',
        params: { textDocument: { uri } }
    });
}

export function createLspPlugin(filePath: string | null, projectPath: string | null, languageId: string) {
    if (!filePath) return [];

    return ViewPlugin.fromClass(class {
        private documentUri: string;
        private rootUri: string | null;
        private version: number = 0;
        private unsubscribe: (() => void) | null = null;

        constructor(private view: EditorView) {
            // 使用 vscode-uri 标准化路径
            this.documentUri = URI.file(filePath).toString();
            this.rootUri = projectPath ? URI.file(projectPath).toString() : null;

            this.initLsp();
        }

        initLsp() {
            // 1. 启动对应语言的服务
            window.electronAPI.lsp.start(languageId);

            // 2. 监听通知
            this.unsubscribe = window.electronAPI.lsp.onNotification((lang, method, params) => {
                // 只处理当前语言和当前文件的通知
                if (lang === languageId && method === 'textDocument/publishDiagnostics') {
                    this.handleDiagnostics(params);
                }
            });

            // 3. 发送初始化握手 (延迟一点确保进程启动)
            setTimeout(() => {
                // Initialize
                window.electronAPI.lsp.send(languageId, {
                    jsonrpc: '2.0',
                    id: 0,
                    method: 'initialize',
                    params: {
                        processId: null,
                        rootUri: this.rootUri,
                        capabilities: {
                            textDocument: {
                                synchronization: { didOpen: true, didChange: true, didSave: true },
                                completion: { completionItem: { documentationFormat: ['markdown', 'plaintext'] } },
                                hover: { contentFormat: ['markdown', 'plaintext'] },
                                definition: { linkSupport: true },
                                publishDiagnostics: { relatedInformation: true }
                            }
                        }
                    }
                });

                // DidOpen
                window.electronAPI.lsp.send(languageId, {
                    jsonrpc: '2.0',
                    method: 'textDocument/didOpen',
                    params: {
                        textDocument: {
                            uri: this.documentUri,
                            languageId: languageId,
                            version: this.version,
                            text: this.view.state.doc.toString()
                        }
                    }
                });
            }, 100);
        }

        handleDiagnostics(params: any) {
            if (params.uri !== this.documentUri) return;

            const doc = this.view.state.doc;
            const diagnostics: Diagnostic[] = params.diagnostics.map((d: any) => {
                // LSP 范围转 CM 偏移量
                const from = doc.line(d.range.start.line + 1).from + d.range.start.character;
                const to = doc.line(d.range.end.line + 1).from + d.range.end.character;
                return {
                    from: Math.min(from, doc.length),
                    to: Math.min(to, doc.length),
                    severity: this.mapSeverity(d.severity),
                    message: d.message,
                    source: d.source
                };
            });

            this.view.dispatch(setDiagnostics(this.view.state, diagnostics));
        }

        mapSeverity(sev: number): "error" | "warning" | "info" | "hint" {
            switch (sev) {
                case 1: return "error";
                case 2: return "warning";
                case 3: return "info";
                default: return "hint";
            }
        }

        update(update: ViewUpdate) {
            if (update.docChanged) {
                this.version++;
                window.electronAPI.lsp.send(languageId, {
                    jsonrpc: '2.0',
                    method: 'textDocument/didChange',
                    params: {
                        textDocument: { uri: this.documentUri, version: this.version },
                        contentChanges: [{ text: update.state.doc.toString() }]
                    }
                });
            }
        }

        destroy() {
            if (this.unsubscribe) this.unsubscribe();
            // Close 协议（可选）
            // window.electronAPI.lsp.send(languageId, { method: 'textDocument/didClose', params: { textDocument: { uri: this.documentUri } } });
        }
    });
}