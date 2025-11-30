// src/main/cli/cli-action.types.ts

export type CliAction =
    | { type: 'exit-fast'; message: string; isError?: boolean }
    | { type: 'start-gui' }
    | { type: 'start-gui-open-folder'; folderPath: string }
    | { type: 'start-gui-open-file'; filePath: string }
    | { type: 'start-gui-open-diff'; filePath: string };