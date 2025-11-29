// src/shared/command-manifest.ts
import { CommandId } from "./types";

export interface CommandMetadata {
    id: CommandId;
    label: string;
    defaultKeybinding?: string;
    description?: string;
}

export const COMMAND_MANIFEST: CommandMetadata[] = [
    // --- File ---
    { id: 'file.new', label: 'New File', defaultKeybinding: 'Ctrl+N' },
    { id: 'file.open', label: 'Open File...', defaultKeybinding: 'Ctrl+O' },
    { id: 'file.openFolder', label: 'Open Folder...', defaultKeybinding: 'Ctrl+Shift+O' },
    { id: 'file.save', label: 'Save', defaultKeybinding: 'Ctrl+S' },
    { id: 'file.saveAs', label: 'Save As...', defaultKeybinding: 'Ctrl+Shift+S' },
    { id: 'app.quit', label: 'Quit', defaultKeybinding: 'Ctrl+Q' },

    // --- View ---
    { id: 'view.togglePalette', label: 'Command Palette', defaultKeybinding: 'Ctrl+Shift+P' },
    { id: 'view.toggleTerminal', label: 'Toggle Terminal', defaultKeybinding: 'Ctrl+`' },
    { id: 'view.toggleGitPanel', label: 'Toggle Source Control', defaultKeybinding: 'Ctrl+Shift+G' },
    { id: 'view.toggleSearchPanel', label: 'Toggle Search', defaultKeybinding: 'Ctrl+Shift+F' },
    { id: 'view.splitEditor', label: 'Split Editor', defaultKeybinding: 'Ctrl+\\' },
    { id: 'view.toggleZenMode', label: 'Toggle Zen Mode', defaultKeybinding: 'Ctrl+Alt+M' },

    // --- Editor (Internal) ---
    { id: 'editor.save', label: 'Editor Save (Internal)', defaultKeybinding: 'Mod+S' },
];

/**
 * 辅助函数：从清单生成默认的 Keymap 对象
 * 供主进程 settings.ts 使用
 */
export function generateDefaultKeymap(): Record<string, string> {
    return COMMAND_MANIFEST.reduce((acc, cmd) => {
        if (cmd.defaultKeybinding) {
            acc[cmd.id] = cmd.defaultKeybinding;
        }
        return acc;
    }, {} as Record<string, string>);
}