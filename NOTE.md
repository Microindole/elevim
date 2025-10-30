 1. C++ 原生模块编译 问题
```bash
innerError Error: Cannot find module '../build/Debug/conpty.node'
Require stack:
- C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsPtyAgent.js
- C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsTerminal.js
- C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\index.js
- C:\Users\15139\Desktop\elevim\dist\main\index.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1152:15)
    at s._resolveFilename (node:electron/js2c/browser_init:2:120426)
    at Module._load (node:internal/modules/cjs/loader:993:27)
    at c._load (node:electron/js2c/node_init:2:13801)
    at Module.require (node:internal/modules/cjs/loader:1240:19)
    at require (node:internal/modules/helpers:179:18)
    at new WindowsPtyAgent (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsPtyAgent.js:45:40)
    at new WindowsTerminal (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsTerminal.js:51:24)
    at Object.spawn (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\index.js:29:12)
    at IpcMainImpl.<anonymous> (C:\Users\15139\Desktop\elevim\dist\main\index.js:5564:26) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    'C:\\Users\\15139\\Desktop\\elevim\\node_modules\\node-pty\\lib\\windowsPtyAgent.js',
    'C:\\Users\\15139\\Desktop\\elevim\\node_modules\\node-pty\\lib\\windowsTerminal.js',
    'C:\\Users\\15139\\Desktop\\elevim\\node_modules\\node-pty\\lib\\index.js',
    'C:\\Users\\15139\\Desktop\\elevim\\dist\\main\\index.js'
  ]
}
[Main] Failed to spawn pty process: Error: The module '\\?\C:\Users\15139\Desktop\elevim\node_modules\node-pty\build\Release\conpty.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version of Node.js requires
NODE_MODULE_VERSION 123. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
    at process.func [as dlopen] (node:electron/js2c/node_init:2:2214)
    at Module._extensions..node (node:internal/modules/cjs/loader:1470:18)
    at Object.func [as .node] (node:electron/js2c/node_init:2:2214)
    at Module.load (node:internal/modules/cjs/loader:1215:32)
    at Module._load (node:internal/modules/cjs/loader:1031:12)
    at c._load (node:electron/js2c/node_init:2:13801)
    at Module.require (node:internal/modules/cjs/loader:1240:19)
    at require (node:internal/modules/helpers:179:18)
    at new WindowsPtyAgent (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsPtyAgent.js:41:36)
    at new WindowsTerminal (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsTerminal.js:51:24) {
  code: 'ERR_DLOPEN_FAILED'
}
[Main] Invalid resize parameters received or pty not running: { cols: 73, rows: 11 }
[Main] Received TERMINAL_INIT - attempting to spawn.
[Main] Spawning shell: powershell.exe in C:\Users\15139
innerError Error: Cannot find module '../build/Debug/conpty.node'
Require stack:
- C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsPtyAgent.js
- C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsTerminal.js
- C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\index.js
- C:\Users\15139\Desktop\elevim\dist\main\index.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1152:15)
    at s._resolveFilename (node:electron/js2c/browser_init:2:120426)
    at Module._load (node:internal/modules/cjs/loader:993:27)
    at c._load (node:electron/js2c/node_init:2:13801)
    at Module.require (node:internal/modules/cjs/loader:1240:19)
    at require (node:internal/modules/helpers:179:18)
    at new WindowsPtyAgent (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsPtyAgent.js:45:40)
    at new WindowsTerminal (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsTerminal.js:51:24)
    at Object.spawn (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\index.js:29:12)
    at IpcMainImpl.<anonymous> (C:\Users\15139\Desktop\elevim\dist\main\index.js:5564:26) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    'C:\\Users\\15139\\Desktop\\elevim\\node_modules\\node-pty\\lib\\windowsPtyAgent.js',
    'C:\\Users\\15139\\Desktop\\elevim\\node_modules\\node-pty\\lib\\windowsTerminal.js',
    'C:\\Users\\15139\\Desktop\\elevim\\node_modules\\node-pty\\lib\\index.js',
    'C:\\Users\\15139\\Desktop\\elevim\\dist\\main\\index.js'
  ]
}
[Main] Failed to spawn pty process: Error: The module '\\?\C:\Users\15139\Desktop\elevim\node_modules\node-pty\build\Release\conpty.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version of Node.js requires
NODE_MODULE_VERSION 123. Please try re-compiling or re-installing
the module (for instance, using `npm rebuild` or `npm install`).
    at process.func [as dlopen] (node:electron/js2c/node_init:2:2214)
    at Module._extensions..node (node:internal/modules/cjs/loader:1470:18)
    at Object.func [as .node] (node:electron/js2c/node_init:2:2214)
    at Module.load (node:internal/modules/cjs/loader:1215:32)
    at Module._load (node:internal/modules/cjs/loader:1031:12)
    at c._load (node:electron/js2c/node_init:2:13801)
    at Module.require (node:internal/modules/cjs/loader:1240:19)
    at require (node:internal/modules/helpers:179:18)
    at new WindowsPtyAgent (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsPtyAgent.js:41:36)
    at new WindowsTerminal (C:\Users\15139\Desktop\elevim\node_modules\node-pty\lib\windowsTerminal.js:51:24) {
  code: 'ERR_DLOPEN_FAILED'
}
```
> 解决方法

```bash
 npx electron-builder install-app-deps
```