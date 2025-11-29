// src/renderer/features/git/components/GitPanel/hooks/useGitOperations.ts
import { GitFileChange } from '../../../../main/lib/git/types';

const APP_EVENTS = {
    GIT_BRANCH_CHANGED: 'git-branch-changed',
} as const;

interface UseGitOperationsProps {
    loadChanges: () => Promise<void>;
    loadBranches: () => Promise<void>;
    loadCommits: () => Promise<void>;
    loadAll: () => void;
}

export const useGitOperations = ({
                                     loadChanges,
                                     loadBranches,
                                     loadCommits,
                                     loadAll,
                                 }: UseGitOperationsProps) => {
    const handleStage = async (filePath: string) => {
        const success = await window.electronAPI.git.gitStageFile(filePath); // MODIFIED
        if (success) await loadChanges();
    };

    const handleUnstage = async (filePath: string) => {
        const success = await window.electronAPI.git.gitUnstageFile(filePath); // MODIFIED
        if (success) await loadChanges();
    };

    const handleDiscard = async (filePath: string) => {
        const confirmed = await window.electronAPI.window.showConfirmBox({
            type: 'warning',
            title: '确认丢弃',
            message: `您确定要丢弃 ${filePath} 的所有更改吗？`,
            detail: '此操作不可撤销。'
        });

        if (!confirmed) return;

        const success = await window.electronAPI.git.gitDiscardChanges(filePath);
        if (success) await loadChanges();
    };

    const handleCommit = async (commitMessage: string, stagedChanges: GitFileChange[]) => {
        const trimmedMessage = commitMessage.trim();

        if (!trimmedMessage) {
            await window.electronAPI.window.showMessageBox({
                type: 'info',
                title: '提交',
                message: '请输入提交信息。'
            });
            return false;
        }

        if (trimmedMessage.length < 3) {
            alert('Commit message must be at least 3 characters long');
            return false;
        }

        if (stagedChanges.length === 0) {
            alert('No staged changes. Please stage files first.');
            return false;
        }

        const success = await window.electronAPI.git.gitCommit(trimmedMessage); // MODIFIED
        if (success) {
            await loadChanges();
            await loadCommits();
            return true;
        } else {
            await window.electronAPI.window.showMessageBox({
                type: 'error',
                title: '提交失败',
                message: '提交失败。',
                detail: '请检查 Git user.name 和 user.email 是否已配置。'
            });return false;
        }
    };

    const handleCheckoutBranch = async (branchName: string) => {
        const currentChanges = await window.electronAPI.git.gitGetChanges(); // MODIFIED
        const hasModifications = currentChanges.filter(c => c.status !== 'untracked').length > 0;

        if (hasModifications) {
            window.confirm(
                `You have uncommitted changes that will prevent branch switching.\n\n` +
                `Please commit or discard your changes first.\n\n` +
                `Click OK to close this dialog.`
            );
            return;
        }

        const success = await window.electronAPI.git.gitCheckoutBranch(branchName); // MODIFIED
        if (success) {
            loadAll();
            alert(`Switched to branch: ${branchName}`);
            window.dispatchEvent(new CustomEvent(APP_EVENTS.GIT_BRANCH_CHANGED));
        } else {
            alert(`Failed to switch to branch: ${branchName}`);
        }
    };

    const handleCreateBranch = async () => {
        const branchName = prompt('Enter new branch name:');
        if (!branchName) return;

        const success = await window.electronAPI.git.gitCreateBranch(branchName); // MODIFIED
        if (success) {
            await loadBranches();
        } else {
            alert(`Failed to create branch ${branchName}`);
        }
    };

    const handleStash = async (changes: GitFileChange[]) => {
        const hasChangesToStash = changes.some(c => c.status !== 'untracked');
        if (!hasChangesToStash) {
            alert("No local modifications to stash.");
            return;
        }

        const confirmed = await window.electronAPI.window.showConfirmBox({
            type: 'question',
            title: '确认贮藏',
            message: '您确定要贮藏当前的工作区更改吗？'
        });
        if (!confirmed) return;

        const success = await window.electronAPI.git.gitStash(); // MODIFIED
        if (success) {
            await loadChanges();
            await window.electronAPI.window.showMessageBox({ type: 'info', title: '贮藏', message: '更改已贮藏。' });
        } else {
            await window.electronAPI.window.showMessageBox({ type: 'error', title: '贮藏', message: '贮藏失败。' });
        }
    };

    const handleStashPop = async () => {
        const confirmed = await window.electronAPI.window.showConfirmBox({
            type: 'warning',
            title: '确认应用贮藏',
            message: '您确定要应用最新的贮藏吗？',
            detail: '这可能会导致冲突。'
        });

        const success = await window.electronAPI.git.gitStashPop(); // MODIFIED
        if (success) {
            await loadChanges();
            alert("Stash applied.");
        } else {
            alert("Failed to apply stash. (Perhaps no stash exists, or there are conflicts).");
        }
    };

    return {
        handleStage,
        handleUnstage,
        handleDiscard,
        handleCommit,
        handleCheckoutBranch,
        handleCreateBranch,
        handleStash,
        handleStashPop,
    };
};