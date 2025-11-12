// src/main/index.ts
import { app, BrowserWindow, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { registerIpcHandlers } from './ipc-handlers';
import { readDirectory } from './lib/file-system';
import { IPC_CHANNELS } from '../shared/constants';
import { parseCliArguments } from './cli/cli-handler';
import { CliAction } from './cli/cli-action.types';

const cliAction: CliAction = parseCliArguments(process.argv);

// --- 1. 处理快速退出命令 ---
if (cliAction.type === 'exit-fast') {
  if (cliAction.isError) {
    console.error(cliAction.message);
  } else {
    console.log(cliAction.message);
  }
  app.quit();
}

// --- 2. Protocol 注册（在 app.ready 之前） ---
console.log('[Protocol] Registering elevim:// protocol...');

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('elevim', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('elevim');
}

// --- 3. 单实例锁（处理 protocol URL） ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[App] Another instance is running, quitting...');
  app.quit();
} else {
  // Windows/Linux: 在第二个实例启动时处理 URL
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('[Protocol] second-instance:', commandLine);

    // 查找 elevim:// URL
    const protocolUrl = commandLine.find(arg => arg.startsWith('elevim://'));
    if (protocolUrl) {
      console.log('[Protocol] Received in second instance:', protocolUrl);
      // URL 会自动传递给已打开的授权窗口
    }

    // 如果有主窗口，聚焦它
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // macOS: 处理 open-url 事件
  app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('[Protocol] open-url:', url);
    // URL 会自动传递给已打开的授权窗口
  });
}

function createWindow(mainWindow: BrowserWindow) {
  mainWindow.loadFile('index.html');
  registerIpcHandlers(mainWindow);

  mainWindow.on('closed', () => {
    // Window cleanup
  });
}

if (cliAction.type.startsWith('start-gui')) {
  app.whenReady().then(() => {
    // 注册自定义 protocol handler（在 ready 之后）
    protocol.registerStringProtocol('elevim', (request, callback) => {
      console.log('[Protocol] Handler called:', request.url);
      // 这里不需要做任何事，授权窗口会自己处理
      callback('OK');
    });

    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      icon: path.join(app.getAppPath(), 'resources/logo.png'),
      frame: false,
      titleBarStyle: 'hidden',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      }
    });

    // Material Icon Protocol
    protocol.registerFileProtocol('material-icon', (request, callback) => {
      try {
        const iconName = request.url.replace('material-icon://', '');
        const possiblePaths = [
          path.join(process.cwd(), 'node_modules/material-icon-theme/icons', iconName),
          path.join(__dirname, '../../node_modules/material-icon-theme/icons', iconName),
          path.join(app.getAppPath(), 'node_modules/material-icon-theme/icons', iconName),
        ];
        for (const iconPath of possiblePaths) {
          if (fs.existsSync(iconPath)) {
            callback({ path: iconPath });
            return;
          }
        }
        console.warn('[Icon] Not found:', iconName);
        callback({ error: -6 });
      } catch (error) {
        console.error('[Icon] Error:', error);
        callback({ error: -2 });
      }
    });

    // 处理 CLI 参数
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        switch(cliAction.type) {
          case 'start-gui-open-folder':
            const fileTree = await readDirectory(cliAction.folderPath);
            mainWindow.webContents.send(IPC_CHANNELS.OPEN_FOLDER_FROM_CLI, {
              name: path.basename(cliAction.folderPath),
              path: cliAction.folderPath,
              children: fileTree
            });
            break;

          case 'start-gui-open-file':
            const content = await fs.promises.readFile(cliAction.filePath, 'utf-8');
            mainWindow.webContents.send(IPC_CHANNELS.OPEN_FILE_FROM_CLI, {
              content: content,
              filePath: cliAction.filePath
            });
            break;

          case 'start-gui-open-diff':
            mainWindow.webContents.send(IPC_CHANNELS.OPEN_DIFF_FROM_CLI, cliAction.filePath);
            break;
        }
      } catch (e) {
        console.error('Failed to send CLI action to renderer:', e);
      }
    });

    createWindow(mainWindow);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow(mainWindow);
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});