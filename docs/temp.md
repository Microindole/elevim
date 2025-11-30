```
elevim
├─ build.js
├─ CODE_OF_CONDUCT.md
├─ CONTRIBUTING.md
├─ docs
│  ├─ step.md
│  ├─ temp.md
│  ├─ themes.md
│  └─ WARNING.md
├─ index.html
├─ LICENSE
├─ package-lock.json
├─ package.json
├─ README.md
├─ resources
│  ├─ logo.png
│  └─ logo1.png
├─ SECURITY.md
├─ src
│  ├─ main
│  │  ├─ cli
│  │  │  ├─ cli-action.types.ts
│  │  │  └─ cli-handler.ts
│  │  ├─ index.ts
│  │  ├─ ipc-handlers
│  │  │  ├─ file.handlers.ts
│  │  │  ├─ git.handlers.ts
│  │  │  ├─ github.handlers.ts
│  │  │  ├─ index.ts
│  │  │  ├─ lsp.handlers.ts
│  │  │  ├─ menu.handlers.ts
│  │  │  ├─ session.handlers.ts
│  │  │  ├─ settings.handlers.ts
│  │  │  ├─ state.ts
│  │  │  ├─ terminal.handlers.ts
│  │  │  └─ window.handlers.ts
│  │  ├─ ipc-handlers.ts
│  │  ├─ lib
│  │  │  ├─ file-system.ts
│  │  │  ├─ git
│  │  │  │  ├─ commands.ts
│  │  │  │  ├─ types.ts
│  │  │  │  └─ watcher.ts
│  │  │  ├─ git-service.ts
│  │  │  ├─ github-auth.ts
│  │  │  ├─ lsp-manager.ts
│  │  │  ├─ session.ts
│  │  │  └─ settings.ts
│  │  └─ preload.ts
│  ├─ renderer
│  │  ├─ features
│  │  │  ├─ editor
│  │  │  │  ├─ components
│  │  │  │  │  ├─ Breadcrumbs
│  │  │  │  │  │  ├─ Breadcrumbs.css
│  │  │  │  │  │  └─ Breadcrumbs.tsx
│  │  │  │  │  ├─ Editor
│  │  │  │  │  │  ├─ Editor.css
│  │  │  │  │  │  └─ Editor.tsx
│  │  │  │  │  ├─ EditorGroup
│  │  │  │  │  │  ├─ EditorGroup.css
│  │  │  │  │  │  └─ EditorGroup.tsx
│  │  │  │  │  └─ Tabs
│  │  │  │  │     ├─ Tabs.css
│  │  │  │  │     └─ Tabs.tsx
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ useCodeMirror.ts
│  │  │  │  │  └─ useFileOperations.ts
│  │  │  │  └─ lib
│  │  │  │     ├─ breadcrumbs-util.ts
│  │  │  │     ├─ focus-mode.ts
│  │  │  │     ├─ language-map.ts
│  │  │  │     ├─ lsp-completion.ts
│  │  │  │     ├─ lsp-hover.ts
│  │  │  │     ├─ lsp-plugin.ts
│  │  │  │     ├─ theme-generator.ts
│  │  │  │     ├─ typewriter-scroll.ts
│  │  │  │     └─ wiki-links.ts
│  │  │  ├─ explorer
│  │  │  │  ├─ components
│  │  │  │  │  └─ FileTree
│  │  │  │  │     ├─ FileTree.css
│  │  │  │  │     ├─ FileTree.tsx
│  │  │  │  │     ├─ icon-map.ts
│  │  │  │  │     └─ TreeNode.tsx
│  │  │  │  └─ hooks
│  │  │  │     ├─ useCliHandlers.ts
│  │  │  │     └─ useFileTree.ts
│  │  │  ├─ git
│  │  │  │  ├─ components
│  │  │  │  │  └─ GitPanel
│  │  │  │  │     ├─ DiffViewer.css
│  │  │  │  │     ├─ DiffViewer.tsx
│  │  │  │  │     ├─ GitPanel.css
│  │  │  │  │     ├─ GitPanel.tsx
│  │  │  │  │     ├─ PublishRepoModal.css
│  │  │  │  │     ├─ PublishRepoModal.tsx
│  │  │  │  │     └─ tabs
│  │  │  │  │        ├─ BranchesTab.css
│  │  │  │  │        ├─ BranchesTab.tsx
│  │  │  │  │        ├─ ChangesTab.css
│  │  │  │  │        ├─ ChangesTab.tsx
│  │  │  │  │        ├─ CommitBox.tsx
│  │  │  │  │        ├─ FileChangesList.tsx
│  │  │  │  │        ├─ HistoryTab.css
│  │  │  │  │        ├─ HistoryTab.tsx
│  │  │  │  │        └─ StashButtons.tsx
│  │  │  │  └─ hooks
│  │  │  │     ├─ useBranchChange.ts
│  │  │  │     ├─ useCurrentBranch.ts
│  │  │  │     ├─ useGitData.ts
│  │  │  │     ├─ useGitOperations.ts
│  │  │  │     └─ useGitStatus.ts
│  │  │  ├─ search
│  │  │  │  └─ components
│  │  │  │     └─ SearchPanel
│  │  │  │        ├─ SearchPanel.css
│  │  │  │        └─ SearchPanel.tsx
│  │  │  ├─ settings
│  │  │  │  └─ components
│  │  │  │     └─ SettingsPanel
│  │  │  │        ├─ KeybindingInput.css
│  │  │  │        ├─ KeybindingInput.tsx
│  │  │  │        ├─ SettingsPanel.css
│  │  │  │        └─ SettingsPanel.tsx
│  │  │  ├─ terminal
│  │  │  │  ├─ components
│  │  │  │  │  └─ Terminal
│  │  │  │  │     ├─ Terminal.css
│  │  │  │  │     └─ Terminal.tsx
│  │  │  │  └─ hooks
│  │  │  │     └─ useTerminal.ts
│  │  │  └─ workbench
│  │  │     ├─ commands
│  │  │     │  └─ types.ts
│  │  │     ├─ components
│  │  │     │  ├─ ActivityBar
│  │  │     │  │  ├─ ActivityBar.css
│  │  │     │  │  ├─ ActivityBar.tsx
│  │  │     │  │  └─ icons.tsx
│  │  │     │  ├─ CommandPalette
│  │  │     │  │  ├─ CommandPalette.css
│  │  │     │  │  └─ CommandPalette.tsx
│  │  │     │  ├─ StatusBar
│  │  │     │  │  ├─ StatusBar.css
│  │  │     │  │  └─ StatusBar.tsx
│  │  │     │  └─ TitleBar
│  │  │     │     ├─ TitleBar.css
│  │  │     │     └─ TitleBar.tsx
│  │  │     └─ hooks
│  │  │        ├─ useCommands.ts
│  │  │        ├─ useKeyboardShortcuts.ts
│  │  │        └─ useSidebar.ts
│  │  ├─ styles
│  │  │  └─ global.css
│  │  └─ types
│  ├─ shared
│  │  ├─ command-manifest.ts
│  │  ├─ components
│  │  │  └─ ContextMenu
│  │  │     ├─ ContextMenu.css
│  │  │     └─ ContextMenu.tsx
│  │  ├─ constants.ts
│  │  ├─ hooks
│  │  │  ├─ useGlobalEvents.ts
│  │  │  └─ useIpcListeners.ts
│  │  ├─ themes
│  │  │  ├─ dracula.ts
│  │  │  ├─ github-dark.ts
│  │  │  ├─ index.ts
│  │  │  ├─ monokai.ts
│  │  │  ├─ nord.ts
│  │  │  ├─ one-dark.ts
│  │  │  ├─ origin.ts
│  │  │  ├─ solarized-dark.ts
│  │  │  └─ tokyo-night.ts
│  │  └─ types.ts
│  └─ types
│     └─ jschardet.d.ts
└─ tsconfig.json
```