// src/main/lib/github-auth.ts
import { BrowserWindow } from 'electron';
import { Octokit } from '@octokit/rest';
import * as keytar from 'keytar';
import fetch from 'node-fetch';
import * as crypto from 'crypto';

// ⚠️ 确保这是你的 GitHub App Client ID
const GITHUB_CLIENT_ID = 'Iv23liZMFGNyDRocYCXW';
const SERVICE_NAME = 'Elevim';
const ACCOUNT_NAME = 'github-token';

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
        const { verifier, challenge } = generatePKCE();

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

            const authUrl = `https://github.com/login/oauth/authorize`;
            const params = new URLSearchParams({
                client_id: GITHUB_CLIENT_ID,
                scope: 'repo,user',
                redirect_uri: 'elevim://auth/callback',
                code_challenge: challenge,
                code_challenge_method: 'S256'
            });

            console.log('[Auth] Opening auth window with URL:', `${authUrl}?${params.toString()}`);
            authWindow.loadURL(`${authUrl}?${params.toString()}`);

            const handleCallback = async (url: string) => {
                if (isResolved) {
                    console.log('[Auth] Callback already handled, ignoring');
                    return;
                }

                console.log('[Auth] Processing callback:', url);
                isResolved = true;

                // 立即清理监听器
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

                    console.log('[Auth] Got authorization code, exchanging for token...');

                    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            client_id: GITHUB_CLIENT_ID,
                            code: code,
                            code_verifier: verifier,
                            redirect_uri: 'elevim://auth/callback'
                        })
                    });

                    if (!tokenResponse.ok) {
                        const errorText = await tokenResponse.text();
                        throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
                    }

                    const tokenData: any = await tokenResponse.json();
                    console.log('[Auth] Token response received:', {
                        hasToken: !!tokenData.access_token,
                        error: tokenData.error
                    });

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

            // 监听多个导航事件以确保捕获回调
            authWindow.webContents.on('will-redirect', (event, url) => {
                console.log('[Auth] will-redirect event:', url);
                if (url.startsWith('elevim://')) {
                    event.preventDefault();
                    handleCallback(url);
                }
            });

            authWindow.webContents.on('will-navigate', (event, url) => {
                console.log('[Auth] will-navigate event:', url);
                if (url.startsWith('elevim://')) {
                    event.preventDefault();
                    handleCallback(url);
                }
            });

            authWindow.webContents.on('did-navigate', (event, url) => {
                console.log('[Auth] did-navigate event:', url);
                if (url.startsWith('elevim://')) {
                    handleCallback(url);
                }
            });

            // 窗口关闭处理
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
            auto_init: false // 不自动初始化，因为本地已有仓库
        });

        console.log('[Auth] Repo created:', response.data.html_url);

        if (response.data.clone_url) {
            return response.data.clone_url;
        } else {
            throw new Error('No clone_url in response');
        }
    } catch (e: any) {
        console.error('[Auth] Failed to create repo:', e.message);

        // 更友好的错误提示
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
            affiliation: 'owner' // 只显示用户自己的仓库
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