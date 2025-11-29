// src/renderer/features/workbench/hooks/useCommands.ts
import { useMemo } from 'react';
import { Command } from '../components/CommandPalette/CommandPalette';
import { CommandRegistry } from '../commands/types';
import { COMMAND_MANIFEST } from '../../../../shared/command-manifest';

interface UseCommandsProps {
    commandRegistry: CommandRegistry;
}

export function useCommands({ commandRegistry }: UseCommandsProps) {
    const commands = useMemo<Command[]>(() => {
        return COMMAND_MANIFEST
            .map(meta => {
                const handler = commandRegistry[meta.id];
                // 如果当前没有注册这个命令的实现，则跳过
                if (!handler) return null;

                const cmd: Command = {
                    id: meta.id,
                    name: meta.label,
                    action: handler
                };
                return cmd;
            })
            .filter((cmd): cmd is Command => cmd !== null);
    }, [commandRegistry]);

    return commands;
}