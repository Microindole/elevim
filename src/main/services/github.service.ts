import { EventEmitter } from 'events';
import { BrowserWindow, dialog } from 'electron';
import * as auth from '../lib/github-auth';
import * as git from '../lib/git-service';
import { IGitHubService } from '../../shared/api-contract';

export class GitHubService extends EventEmitter implements IGitHubService {
    constructor(private mainWindow: BrowserWindow) { super(); }

    async getTokenStatus() {
        const token = await auth.getGitHubToken();
        return !!token;
    }

    async startAuth() {
        const token = await auth.startGitHubAuth(this.mainWindow);
        return !!token;
    }

    async listRepos() {
        let token = await auth.getGitHubToken();
        if (!token) token = await auth.startGitHubAuth(this.mainWindow);
        return await auth.listUserRepos(token);
    }

    async publishRepo(folderPath: string, repoName: string, isPrivate: boolean) {
        try {
            let token = await auth.getGitHubToken();
            if (!token) token = await auth.startGitHubAuth(this.mainWindow);

            // 1. Init & Commit
            const status = await git.getGitStatus(folderPath);
            if (status === null) {
                await git.initRepo(folderPath);
                await git.stageFile(folderPath, '.');
                await git.commit(folderPath, 'Initial commit');
            }

            // 2. Create Remote
            const cloneUrl = await auth.createGitHubRepo(token, repoName, isPrivate);

            // 3. Add Remote
            await git.addRemote(folderPath, 'origin', cloneUrl);

            // 4. Push
            const branch = await git.getCurrentBranch(folderPath) || 'main';
            await git.pushToRemote(folderPath, 'origin', branch);

            this.emit('publish-success');
            return { success: true, error: null, repoUrl: cloneUrl };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    async linkRemote(folderPath: string, repoUrl: string) {
        try {
            // 简化版逻辑
            await git.addRemote(folderPath, 'origin', repoUrl);
            const branch = await git.getCurrentBranch(folderPath) || 'main';
            await git.pushToRemote(folderPath, 'origin', branch);

            this.emit('publish-success');
            return { success: true, error: null };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }
}