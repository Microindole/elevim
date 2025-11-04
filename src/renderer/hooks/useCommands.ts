// src/renderer/hooks/useCommands.ts
import { useMemo } from 'react';
import { Command } from '../components/CommandPalette/CommandPalette';
import { SidebarView } from '../components/ActivityBar/ActivityBar';

interface UseCommandsProps {
    handleMenuNewFile: () => void;
    handleMenuOpenFile: () => void;
    handleMenuOpenFolder: () => Promise<any>;
    handleSave: () => Promise<void>;
    handleMenuSaveAsFile: () => void;
    handleMenuCloseWindow: () => void;
    handleViewChange: (view: SidebarView) => void;
}

export function useCommands({
                                handleMenuNewFile,
                                handleMenuOpenFile,
                                handleMenuOpenFolder,
                                handleSave,
                                handleMenuSaveAsFile,
                                handleMenuCloseWindow,
                                handleViewChange
                            }: UseCommandsProps) {
    const commands = useMemo<Command[]>(() => [
        { id: 'file.new', name: 'File: New File', action: handleMenuNewFile },
        { id: 'file.open', name: 'File: Open File...', action: handleMenuOpenFile },
        { id: 'file.openFolder', name: 'File: Open Folder...', action: handleMenuOpenFolder },
        { id: 'file.save', name: 'File: Save', action: handleSave },
        { id: 'file.saveAs', name: 'File: Save As...', action: handleMenuSaveAsFile },
        { id: 'app.quit', name: 'Application: Quit', action: handleMenuCloseWindow },
        { id: 'git.toggle', name: 'Git: Toggle Source Control', action: () => handleViewChange('git') },
        { id: 'search.toggle', name: 'Search: Toggle Search', action: () => handleViewChange('search') },
    ], [
        handleMenuNewFile,
        handleMenuOpenFile,
        handleMenuOpenFolder,
        handleSave,
        handleMenuSaveAsFile,
        handleMenuCloseWindow,
        handleViewChange
    ]);

    return commands;
}