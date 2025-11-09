// src/renderer/components/GitPanel/tabs/ChangesTab.tsx
import React, { useState } from 'react';
import { GitFileChange } from '../../../../main/lib/git/types';
import FileChangesList from './FileChangesList';
import CommitBox from './CommitBox';
import StashButtons from './StashButtons';
import './ChangesTab.css';

interface ChangesTabProps {
    changes: GitFileChange[];
    onStage: (filePath: string) => Promise<void>;
    onUnstage: (filePath: string) => Promise<void>;
    onDiscard: (filePath: string) => Promise<void>;
    onCommit: (message: string, stagedChanges: GitFileChange[]) => Promise<boolean>;
    onStash: (changes: GitFileChange[]) => Promise<void>;
    onStashPop: () => Promise<void>;
    onViewDiff: (file: { path: string; staged: boolean }) => void;
}

export default function ChangesTab({
                                       changes,
                                       onStage,
                                       onUnstage,
                                       onDiscard,
                                       onCommit,
                                       onStash,
                                       onStashPop,
                                       onViewDiff,
                                   }: ChangesTabProps) {
    const [commitMessage, setCommitMessage] = useState('');

    const stagedChanges = changes.filter(c => c.staged);
    const unstagedChanges = changes.filter(c => !c.staged);
    const hasChangesToStash = changes.some(c => c.status !== 'untracked');

    const handleCommit = async () => {
        const success = await onCommit(commitMessage, stagedChanges);
        if (success) setCommitMessage('');
    };

    return (
        <div className="git-changes">
            <StashButtons
                hasChanges={hasChangesToStash}
                onStash={() => onStash(changes)}
                onStashPop={onStashPop}
            />

            {stagedChanges.length > 0 && (
                <CommitBox
                    message={commitMessage}
                    onChange={setCommitMessage}
                    onCommit={handleCommit}
                />
            )}

            {stagedChanges.length > 0 && (
                <FileChangesList
                    title={`Staged Changes (${stagedChanges.length})`}
                    changes={stagedChanges}
                    onAction={onUnstage}
                    onDiscard={onDiscard}
                    onViewDiff={onViewDiff}
                    actionLabel="−"
                    actionTitle="Unstage"
                />
            )}

            {unstagedChanges.length > 0 && (
                <FileChangesList
                    title={`Changes (${unstagedChanges.length})`}
                    changes={unstagedChanges}
                    onAction={onStage}
                    onDiscard={onDiscard}
                    onViewDiff={onViewDiff}
                    actionLabel="+"
                    actionTitle="Stage"
                />
            )}

            {changes.length === 0 && (
                <div className="git-empty">No changes to commit</div>
            )}
        </div>
    );
}