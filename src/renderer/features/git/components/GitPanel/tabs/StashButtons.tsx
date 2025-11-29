// src/renderer/features/git/components/GitPanel/tabs/StashButtons.tsx
import React from 'react';

interface StashButtonsProps {
    hasChanges: boolean;
    onStash: () => void;
    onStashPop: () => void;
}

export default function StashButtons({ hasChanges, onStash, onStashPop }: StashButtonsProps) {
    return (
        <div className="git-actions-bar">
            <button
                className="git-action-btn secondary"
                onClick={onStash}
                title="Stash current changes"
                disabled={!hasChanges}
            >
                Stash
            </button>
            <button
                className="git-action-btn secondary"
                onClick={onStashPop}
                title="Apply latest stash (Pop)"
            >
                Pop Stash
            </button>
        </div>
    );
}