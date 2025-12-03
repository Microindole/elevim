import { EventEmitter } from 'events';
import * as gitLib from '../lib/git-service';
import { IGitService } from '../../shared/api-contract';
import { GitStatusMap, GitFileChange, GitBranch, GitCommit, GitDiff } from '../lib/git/types';

export class GitService extends EventEmitter implements IGitService {
    // 1. 注入依赖：我们需要访问 FileService 来获取当前打开的文件夹
    // 使用结构类型定义，避免循环导入问题
    constructor(private fileService: { getCurrentFolder: () => string | null }) {
        super();
        // 监听底层的 Git Watcher 事件并转发
        gitLib.onGitStatusChange((status) => {
            this.emit('status-change', status);
        });
    }

    // 辅助函数：解析目标路径
    private getTargetPath(folderPath: string | null): string | null {
        return folderPath || this.fileService.getCurrentFolder();
    }

    async initRepo(folderPath: string | null): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;

        const result = await gitLib.initRepo(target);
        if (result) await gitLib.startGitWatcher(target);
        return result;
    }

    async startWatcher(folderPath: string | null): Promise<void> {
        const target = this.getTargetPath(folderPath);
        if (target) {
            await gitLib.startGitWatcher(target);
        }
    }

    async stopWatcher(): Promise<void> {
        await gitLib.stopGitWatcher();
    }

    async getStatus(folderPath: string | null): Promise<GitStatusMap | null> {
        const target = this.getTargetPath(folderPath);
        if (!target) return null;
        return await gitLib.getGitStatus(target);
    }

    async getChanges(folderPath: string | null): Promise<GitFileChange[]> {
        const target = this.getTargetPath(folderPath);
        if (!target) return [];
        return await gitLib.getGitChanges(target);
    }

    async stageFile(folderPath: string | null, filePath: string): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;

        const res = await gitLib.stageFile(target, filePath);
        if (res) this.refreshStatus(target);
        return res;
    }

    async unstageFile(folderPath: string | null, filePath: string): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;

        const res = await gitLib.unstageFile(target, filePath);
        if (res) this.refreshStatus(target);
        return res;
    }

    async discardChanges(folderPath: string | null, filePath: string): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;

        const res = await gitLib.discardChanges(target, filePath);
        if (res) this.refreshStatus(target);
        return res;
    }

    async commit(folderPath: string | null, message: string): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;

        const res = await gitLib.commit(target, message);
        if (res) this.refreshStatus(target);
        return res;
    }

    async getBranches(folderPath: string | null): Promise<GitBranch[]> {
        const target = this.getTargetPath(folderPath);
        if (!target) return [];
        return await gitLib.getBranches(target);
    }

    async checkoutBranch(folderPath: string | null, branchName: string): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;
        return await gitLib.checkoutBranch(target, branchName);
    }

    async createBranch(folderPath: string | null, branchName: string): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;
        return await gitLib.createBranch(target, branchName);
    }

    async getCommits(folderPath: string | null, limit = 50, skip = 0): Promise<GitCommit[]> {
        const target = this.getTargetPath(folderPath);
        if (!target) return [];
        // @ts-ignore
        return await gitLib.getCommitHistory(target, limit, skip);
    }

    async getCommitDetails(folderPath: string | null, commitHash: string) {
        const target = this.getTargetPath(folderPath);
        if (!target) return null;
        return await gitLib.getCommitDetails(target, commitHash);
    }

    async getDiff(folderPath: string | null, filePath: string, staged: boolean): Promise<GitDiff | null> {
        const target = this.getTargetPath(folderPath);
        if (!target) return null;
        return await gitLib.getFileDiff(target, filePath, staged);
    }

    async getCurrentBranch(folderPath: string | null): Promise<string | null> {
        const target = this.getTargetPath(folderPath);
        if (!target) return null;
        return await gitLib.getCurrentBranch(target);
    }

    async stash(folderPath: string | null): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;
        return await gitLib.stashChanges(target);
    }

    async stashPop(folderPath: string | null): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;
        return await gitLib.popStash(target);
    }

    async checkoutCommit(folderPath: string | null, commitHash: string): Promise<boolean> {
        const target = this.getTargetPath(folderPath);
        if (!target) return false;
        return await gitLib.checkoutCommit(target, commitHash);
    }

    async createBranchFromCommit(folderPath: string | null, commitHash: string, branchName?: string): Promise<string | null> {
        const target = this.getTargetPath(folderPath);
        if (!target) return null;
        return await gitLib.createBranchFromCommit(target, commitHash, branchName);
    }

    async openCommitDiff(folderPath: string | null, commitHash: string): Promise<string | null> {
        const target = this.getTargetPath(folderPath);
        if (!target) return null;
        return await gitLib.getCommitDiff(target, commitHash);
    }

    async getRemotes(folderPath: string | null): Promise<string[]> {
        const target = this.getTargetPath(folderPath);
        if (!target) return [];
        return await gitLib.getRemotes(target);
    }

    // 私有方法：在执行变更操作后刷新状态
    private async refreshStatus(folderPath: string) {
        const status = await gitLib.getGitStatus(folderPath);
        gitLib.notifyStatusChange(status);
    }
}