// src/main/lib/github-auth.ts
import { BrowserWindow } from 'electron';
import { Octokit } from '@octokit/rest';
import * as keytar from 'keytar';
import fetch from 'node-fetch';
import * as crypto from 'crypto';

const GITHUB_CLIENT_ID = 'Ov23lizlusHj4HWf8Eli';

const SERVICE_NAME = 'Elevim';
const ACCOUNT_NAME = 'github-token';

// ... (文件的其余部分保持不变) ...

/**
 * 辅助函数：生成 PKCE 所需的 verifier 和 challenge
 */
function generatePKCE() {
    // 1. 创建一个高强度的随机字符串
    const verifier = crypto.randomBytes(32).toString('base64url');

    // 2. 对 verifier 进行 SHA256 哈希，生成 challenge
    const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');

    return { verifier, challenge };
}

/**
 * 从钥匙串安全地获取 Token
 */
export async function getGitHubToken(): Promise<string | null> {
    try {
        return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (e) {
        console.error('[Auth] Failed to get token from keytar:', e);
        return null;
    }
}

/**
 * 启动 OAuth 流程 (PKCE 安全版本)
 */
export function startGitHubAuth(parentWindow: BrowserWindow): Promise<string> {
    return new Promise((resolve, reject) => {
        let isResolved = false;
        // 1. 立即生成 PKCE 码
        const { verifier, challenge } = generatePKCE();

        const authWindow = new BrowserWindow({
            width: 800,
            height: 600,
            modal: true,
            parent: parentWindow,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        const authUrl = `https://github.com/login/oauth/authorize`;
        const params = new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            scope: 'repo,user', // 'repo' 权限用于创建仓库
            redirect_uri: 'elevim://auth/callback',
            code_challenge: challenge, // <--- 关键: 发送 challenge
            code_challenge_method: 'S256' // <--- 关键: 告知使用 S256
        });

        authWindow.loadURL(`${authUrl}?${params.toString()}`);

        const onCallback = async (url: string) => {
            if (isResolved) return;
            isResolved = true;
            try {
                const urlParams = new URLSearchParams(url.split('?')[1]);
                const code = urlParams.get('code');
                if (!code) throw new Error('No code found in callback URL');

                // 2. 用 code + verifier 换取 token
                // (注意：这里完全不需要 CLIENT_SECRET)
                const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        client_id: GITHUB_CLIENT_ID,
                        code: code,
                        code_verifier: verifier, // <--- 关键: 发送 verifier 作为证明
                        redirect_uri: 'elevim://auth/callback'
                    })
                });

                const tokenData: any = await tokenResponse.json();
                const accessToken = tokenData.access_token;

                if (!accessToken) throw new Error('No access_token received');

                // 3. 安全存储 Token
                await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, accessToken);

                authWindow.close();
                resolve(accessToken);

            } catch (e) {
                authWindow.close();
                reject(e);
            }
        };

        // 监听重定向 (保持不变)
        authWindow.webContents.on('will-redirect', (event, url) => {
            if (url.startsWith('elevim://auth/callback')) {
                event.preventDefault();
                onCallback(url);
            }
        });

        authWindow.on('closed', () => {
            if (!isResolved) { // 如果窗口被关闭，并且没有成功回调
                isResolved = true;
                reject(new Error('GitHub authorization was cancelled.'));
            }
        });
    });
}

/**
 * 使用 Token 创建 GitHub 仓库 (此函数保持不变)
 */
export async function createGitHubRepo(token: string, repoName: string, isPrivate: boolean): Promise<string> {
    try {
        const octokit = new Octokit({ auth: token });
        const response = await octokit.repos.createForAuthenticatedUser({
            name: repoName,
            private: isPrivate
        });

        if (response.data.clone_url) {
            return response.data.clone_url;
        } else {
            throw new Error('Failed to create repo, no clone_url returned');
        }
    } catch (e: any) {
        console.error('[Auth] Failed to create GitHub repo:', e.message);
        // 捕获仓库已存在的错误
        if (e.message?.includes('name already exists')) {
            throw new Error(`仓库 "${repoName}" 在你的 GitHub 账户中已存在。`);
        }
        throw e;
    }
}