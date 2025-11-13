// src/main/lib/github-auth.ts
import { BrowserWindow } from 'electron';
import { Octokit } from '@octokit/rest';
import * as keytar from 'keytar';
import fetch from 'node-fetch';
import * as crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';

// ✅ OAuth App Client ID
const GITHUB_CLIENT_ID = 'Ov23liix5I9v3xtrt9v3';
const SERVICE_NAME = 'Elevim';
const ACCOUNT_NAME = 'github-token';

// 获取代理配置
function getProxyAgent() {
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY;
    if (proxyUrl) {
        console.log('[Auth] Using proxy:', proxyUrl);
        return new HttpsProxyAgent(proxyUrl);
    }
    return undefined;
}

function generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');
    return { verifier, challenge };
}

export async function getGitHubToken(): Promise<string | null> {
    try {
        return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (e) {
        console.error('[Auth] Failed to get token from keytar:', e);
        return null;
    }
}

export function startGitHubAuth(parentWindow: BrowserWindow): Promise<string> {
    return new Promise((resolve, reject) => {
        let isResolved = false;
        let authWindow: BrowserWindow | null = null;

        try {
            authWindow = new BrowserWindow({
                width: 800,
                height: 600,
                modal: true,
                parent: parentWindow,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            // 不使用 PKCE，使用标准 OAuth 流程
            const authUrl = `https://github.com/login/oauth/authorize`;
            const params = new URLSearchParams({
                client_id: GITHUB_CLIENT_ID,
                scope: 'repo,user',
                redirect_uri: 'elevim://auth/callback'
                // 移除 PKCE 参数
            });

            const fullUrl = `${authUrl}?${params.toString()}`;
            console.log('[Auth] Opening auth window (without PKCE):', fullUrl);
            authWindow.loadURL(fullUrl);

            const handleCallback = async (url: string) => {
                if (isResolved) {
                    console.log('[Auth] Callback already handled, ignoring');
                    return;
                }

                console.log('[Auth] Processing callback:', url);
                isResolved = true;

                // 清理所有监听器
                if (authWindow && !authWindow.isDestroyed()) {
                    authWindow.webContents.removeAllListeners('will-redirect');
                    authWindow.webContents.removeAllListeners('did-navigate');
                    authWindow.webContents.removeAllListeners('will-navigate');
                    authWindow.removeAllListeners('closed');
                }

                try {
                    const urlObj = new URL(url);
                    const code = urlObj.searchParams.get('code');
                    const error = urlObj.searchParams.get('error');
                    const errorDesc = urlObj.searchParams.get('error_description');

                    if (error) {
                        throw new Error(`GitHub OAuth error: ${errorDesc || error}`);
                    }

                    if (!code) {
                        throw new Error('No authorization code received from GitHub');
                    }

                    console.log('[Auth] Got authorization code:', code.substring(0, 8) + '...');
                    console.log('[Auth] Exchanging code for token (without PKCE)...');

                    // 带重试的 token 交换
                    let tokenData: any = null;
                    let lastError: Error | null = null;

                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            console.log(`[Auth] Token exchange attempt ${attempt}/3...`);

                            // 不使用 PKCE，只发送必需参数
                            const params = new URLSearchParams({
                                client_id: GITHUB_CLIENT_ID,
                                code: code,
                                redirect_uri: 'elevim://auth/callback'
                                // 移除 code_verifier
                            });

                            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Accept': 'application/json',
                                    'User-Agent': 'Elevim-Editor'
                                },
                                body: params.toString(),
                                timeout: 30000,
                                agent: getProxyAgent()
                            } as any);

                            const responseText = await tokenResponse.text();
                            console.log('[Auth] Token response status:', tokenResponse.status);
                            console.log('[Auth] Token response body:', responseText);

                            if (!tokenResponse.ok) {
                                throw new Error(`HTTP ${tokenResponse.status}: ${responseText}`);
                            }

                            tokenData = JSON.parse(responseText);
                            lastError = null;
                            break; // 成功，退出重试循环

                        } catch (e: any) {
                            lastError = e;
                            console.error(`[Auth] Attempt ${attempt} failed:`, e.message);

                            if (attempt < 3) {
                                // 等待后重试（递增延迟）
                                const delay = attempt * 1000;
                                console.log(`[Auth] Retrying in ${delay}ms...`);
                                await new Promise(resolve => setTimeout(resolve, delay));
                            }
                        }
                    }

                    if (lastError || !tokenData) {
                        throw new Error(`Token exchange failed after 3 attempts: ${lastError?.message || 'Unknown error'}`);
                    }

                    if (tokenData.error) {
                        throw new Error(`GitHub error: ${tokenData.error_description || tokenData.error}`);
                    }

                    const accessToken = tokenData.access_token;
                    if (!accessToken) {
                        throw new Error('No access_token in response from GitHub');
                    }

                    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, accessToken);
                    console.log('[Auth] Token saved successfully');

                    if (authWindow && !authWindow.isDestroyed()) {
                        authWindow.close();
                    }
                    resolve(accessToken);

                } catch (e: any) {
                    console.error('[Auth] Callback handling error:', e.message);
                    if (authWindow && !authWindow.isDestroyed()) {
                        authWindow.close();
                    }
                    reject(e);
                }
            };

            // 监听多个导航事件
            authWindow.webContents.on('will-redirect', (event, url) => {
                console.log('[Auth] will-redirect:', url.substring(0, 100));
                if (url.startsWith('elevim://')) {
                    event.preventDefault();
                    handleCallback(url);
                }
            });

            authWindow.webContents.on('will-navigate', (event, url) => {
                console.log('[Auth] will-navigate:', url.substring(0, 100));
                if (url.startsWith('elevim://')) {
                    event.preventDefault();
                    handleCallback(url);
                }
            });

            authWindow.webContents.on('did-navigate', (event, url) => {
                console.log('[Auth] did-navigate:', url.substring(0, 100));
                if (url.startsWith('elevim://')) {
                    handleCallback(url);
                }
            });

            authWindow.on('closed', () => {
                console.log('[Auth] Auth window closed');
                if (!isResolved) {
                    isResolved = true;
                    reject(new Error('GitHub authorization window was closed'));
                }
                authWindow = null;
            });

        } catch (e: any) {
            console.error('[Auth] Failed to create auth window:', e);
            reject(e);
        }
    });
}

export async function createGitHubRepo(token: string, repoName: string, isPrivate: boolean): Promise<string> {
    try {
        console.log('[Auth] Creating GitHub repo:', { repoName, isPrivate });
        const octokit = new Octokit({ auth: token });

        const response = await octokit.repos.createForAuthenticatedUser({
            name: repoName,
            private: isPrivate,
            auto_init: false
        });

        console.log('[Auth] Repo created:', response.data.html_url);

        if (response.data.clone_url) {
            return response.data.clone_url;
        } else {
            throw new Error('No clone_url in response');
        }
    } catch (e: any) {
        console.error('[Auth] Failed to create repo:', e.message);

        if (e.status === 422) {
            throw new Error(`仓库 "${repoName}" 已存在于你的 GitHub 账户中`);
        } else if (e.status === 401) {
            throw new Error('GitHub 授权已过期，请重新授权');
        } else if (e.message?.includes('name already exists')) {
            throw new Error(`仓库 "${repoName}" 已存在`);
        }

        throw new Error(`创建仓库失败: ${e.message}`);
    }
}

export async function listUserRepos(token: string): Promise<Array<{name: string, url: string, private: boolean}>> {
    try {
        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.repos.listForAuthenticatedUser({
            per_page: 100,
            sort: 'updated',
            affiliation: 'owner'
        });

        return data.map(repo => ({
            name: repo.full_name,
            url: repo.clone_url || repo.html_url,
            private: repo.private
        }));
    } catch (e: any) {
        console.error('[Auth] Failed to list repos:', e.message);
        throw e;
    }
}

export async function authAndListRepos(parentWindow: BrowserWindow): Promise<{
    token: string;
    repos: Array<{name: string, url: string, private: boolean}>;
}> {
    const token = await startGitHubAuth(parentWindow);
    const repos = await listUserRepos(token);
    return { token, repos };
}