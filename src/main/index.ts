// src/main/index.ts
import { app, BrowserWindow, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { registerIpcHandlers } from './ipc-handlers';
import { readDirectory } from './lib/file-system';
import { IPC_CHANNELS } from '../shared/constants';
import { handleCliArguments } from './cli-handler';

const cliAction = handleCliArguments(process.argv);

if (cliAction.type === 'print-message') {
  console.log(cliAction.message);
  app.quit();
}

function createWindow(pathToOpen: string | null = null) {
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

  mainWindow.loadFile('index.html');
  // 关闭默认打开 chrome 开发者调试工具窗口, 可使用 Ctrl + Shift + I 开启
  // mainWindow.webContents.openDevTools();

  // 将 mainWindow 实例传递给 IPC 处理器注册函数
  registerIpcHandlers(mainWindow);

  if (cliAction.type === 'open-window' && cliAction.path) {
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        const resolvedPath = cliAction.path; // 路径在 handler 中已经 resolve

        if (cliAction.isFile) {
          // --- 新功能：打开文件 ---
          const content = await fs.promises.readFile(resolvedPath, 'utf-8');
          mainWindow.webContents.send(IPC_CHANNELS.OPEN_FILE_FROM_CLI, {
            content: content,
            filePath: resolvedPath
          });
        } else {
          // --- 旧功能：打开文件夹 ---
          const fileTree = await readDirectory(resolvedPath);
          const tree = {
            name: path.basename(resolvedPath),
            path: resolvedPath,
            children: fileTree
          };
          mainWindow.webContents.send(IPC_CHANNELS.OPEN_FOLDER_FROM_CLI, tree);
        }
      } catch (e) {
        console.error('Failed to open path from CLI:', e);
      }
    });
  }

  mainWindow.on('closed', () => {
    // 在这里我们不需要设置 mainWindow = null，因为闭包会处理好
  });
}

if (cliAction.type === 'open-window') {
  app.whenReady().then(() => {

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

    createWindow(); // 启动窗口

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});