// src/main/services/linters/pythonLinter.ts
import { spawn } from 'child_process';
import { ILinter, LintDiagnostic } from '../linterService';

/**
 * Python Linter (使用 pylint 或 flake8)
 * 注意：需要系统安装 Python 和 pylint/flake8
 */
export class PythonLinter implements ILinter {
    name = 'Python (Basic Syntax)';
    supportedExtensions = ['py'];

    async lint(code: string, filename: string): Promise<LintDiagnostic[]> {
        if (!code.trim()) return [];

        // 方法1: 使用 Python 的内置语法检查
        return this.checkSyntax(code, filename);

        // 方法2: 如果安装了 pylint，可以使用外部工具
        // return this.usePylint(code, filename);
    }

    /**
     * 使用 Python 内置的 compile 函数检查语法
     */
    private async checkSyntax(code: string, filename: string): Promise<LintDiagnostic[]> {
        return new Promise((resolve) => {
            // 使用 Python 的 compile 函数检查语法
            const pythonScript = `
import sys
import py_compile
import tempfile
import os

code = sys.stdin.read()
try:
    compile(code, '${filename}', 'exec')
    print('OK')
except SyntaxError as e:
    print(f'ERROR|{e.lineno}|{e.offset or 1}|{e.msg}')
`;

            const python = spawn('python', ['-c', pythonScript]);
            let output = '';
            let error = '';

            python.stdin.write(code);
            python.stdin.end();

            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.stderr.on('data', (data) => {
                error += data.toString();
            });

            python.on('close', (code) => {
                if (output.trim() === 'OK') {
                    resolve([]);
                    return;
                }

                const diagnostics: LintDiagnostic[] = [];
                const lines = output.trim().split('\n');

                for (const line of lines) {
                    if (line.startsWith('ERROR|')) {
                        const [, lineNum, colNum, message] = line.split('|');
                        diagnostics.push({
                            line: parseInt(lineNum) || 1,
                            column: parseInt(colNum) || 1,
                            severity: 'error',
                            message: message || 'Syntax error',
                            ruleId: 'syntax-error',
                            source: 'python',
                        });
                    }
                }

                resolve(diagnostics);
            });

            python.on('error', (err) => {
                console.error('[Python Linter] Failed to spawn python:', err);
                resolve([]);
            });
        });
    }

    /**
     * 使用 pylint (需要系统安装)
     * 安装: pip install pylint
     */
    private async usePylint(code: string, filename: string): Promise<LintDiagnostic[]> {
        return new Promise((resolve) => {
            const pylint = spawn('pylint', [
                '--output-format=json',
                '--from-stdin',
                filename
            ]);

            let output = '';

            pylint.stdin.write(code);
            pylint.stdin.end();

            pylint.stdout.on('data', (data) => {
                output += data.toString();
            });

            pylint.on('close', () => {
                try {
                    const results = JSON.parse(output);
                    const diagnostics: LintDiagnostic[] = results.map((item: any) => ({
                        line: item.line,
                        column: item.column,
                        severity: item.type === 'error' ? 'error' : 'warning',
                        message: item.message,
                        ruleId: item['message-id'],
                        source: 'pylint',
                    }));
                    resolve(diagnostics);
                } catch (error) {
                    console.error('[Python Linter] Failed to parse pylint output:', error);
                    resolve([]);
                }
            });

            pylint.on('error', (err) => {
                console.error('[Python Linter] Pylint not found:', err);
                resolve([]);
            });
        });
    }
}