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

// --- 3. 如果是 "快速退出" 命令 (如 -v, -h 或 错误) ---
if (cliAction.type === 'exit-fast') {
  if (cliAction.isError) {
    console.error(cliAction.message); // 打印错误
  } else {
    console.log(cliAction.message); // 打印版本或帮助
  }
  app.quit(); // 立即退出
}

function createWindow(mainWindow: BrowserWindow) {
  mainWindow.loadFile('index.html');

  registerIpcHandlers(mainWindow);

  mainWindow.on('closed', () => {
    // 在这里我们不需要设置 mainWindow = null，因为闭包会处理好
  });
}

if (cliAction.type.startsWith('start-gui')) {
  app.whenReady().then(() => {

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
        const defaultIcon = iconName.includes('folder') ? 'folder.svg' : 'file.svg';
        for (const basePath of possiblePaths) {
          const defaultPath = path.join(path.dirname(basePath), defaultIcon);
          if (fs.existsSync(defaultPath)) {
            callback({ path: defaultPath });
            return;
          }
        }
        callback({ error: -6 });
      } catch (error) {
        console.error('[Icon] Error:', error);
        callback({ error: -2 });
      }
    });
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

            // 'start-gui' (无路径) 不需要做任何事
        }
      } catch (e) {
        console.error('Failed to send CLI action to renderer:', e);
      }
    });

    createWindow(mainWindow); // 启动窗口

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