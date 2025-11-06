// src/renderer/components/GitPanel/tabs/CommitBox.tsx
import React from 'react';

interface CommitBoxProps {
    message: string;
    onChange: (message: string) => void;
    onCommit: () => void;
}

export default function CommitBox({ message, onChange, onCommit }: CommitBoxProps) {
    return (
        <div className="git-commit-box">
            <input
                type="text"
                className="git-commit-input"
                placeholder="Commit message..."
                value={message}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                        onCommit();
                    }
                }}
            />
            <button
                className="git-commit-btn"
                onClick={onCommit}
                disabled={!message.trim()}
            >
                Commit
            </button>
        </div>
    );
}