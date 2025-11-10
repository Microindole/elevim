// src/renderer/components/GitPanel/hooks/useGitOperations.ts
import { GitFileChange } from '../../../../main/lib/git-service';

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
        if (!confirm(`Are you sure you want to discard changes to ${filePath}?`)) {
            return;
        }
        const success = await window.electronAPI.git.gitDiscardChanges(filePath); // MODIFIED
        if (success) await loadChanges();
    };

    const handleCommit = async (commitMessage: string, stagedChanges: GitFileChange[]) => {
        const trimmedMessage = commitMessage.trim();

        if (!trimmedMessage) {
            alert('Please enter a commit message');
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
            alert('Committed successfully!');
            return true;
        } else {
            alert('Failed to commit. Check if Git user.name and user.email are configured.');
            return false;
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

        if (!confirm("Are you sure you want to stash your current changes?")) {
            return;
        }

        const success = await window.electronAPI.git.gitStash(); // MODIFIED
        if (success) {
            await loadChanges();
            alert("Changes stashed.");
        } else {
            alert("Failed to stash changes.");
        }
    };

    const handleStashPop = async () => {
        if (!confirm("Are you sure you want to apply the latest stash? This might cause conflicts.")) {
            return;
        }

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