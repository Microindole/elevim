// src/main/index.ts
import { app, BrowserWindow, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { registerIpcHandlers } from './ipc-handlers';
import { readDirectory } from './lib/file-system';
import { IPC_CHANNELS } from '../shared/constants';

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

  if (pathToOpen) {
    mainWindow.webContents.on('did-finish-load', async () => {
      try {
        const folderPath = path.resolve(pathToOpen); // 确保是绝对路径
        const fileTree = await readDirectory(folderPath);
        const tree = {
          name: path.basename(folderPath),
          path: folderPath,
          children: fileTree
        };
        // 发送给渲染进程
        mainWindow.webContents.send(IPC_CHANNELS.OPEN_FOLDER_FROM_CLI, tree);
      } catch (e) {
        console.error('Failed to open folder from CLI:', e);
      }
    });
  }

  mainWindow.on('closed', () => {
    // 在这里我们不需要设置 mainWindow = null，因为闭包会处理好
  });
}

app.whenReady().then(() => {

  let pathToOpen: string | null = null;

  // process.argv[0] = elevim 可执行文件
  // process.argv[1] = (如果是未打包的) main.js
  // process.argv[2] = 用户传入的第一个参数
  const cliArg = process.argv[process.defaultApp ? 2 : 1]; // 适配开发和打包后

  if (cliArg) {
    if (cliArg === '--version' || cliArg === '-v') {
      // package.json 中的版本号 (例如 "1.1.3")
      console.log(app.getVersion());
      app.quit(); // 打印版本后退出
      return;
    }

    // 如果参数不是 --version，我们就认为它是一个路径 (比如 ".")
    if (!cliArg.startsWith('--')) {
      pathToOpen = cliArg;
    }
  }

  // 注册 material-icon 自定义协议
  protocol.registerFileProtocol('material-icon', (request, callback) => {
    try {
      const iconName = request.url.replace('material-icon://', '');

      // 图标文件路径
      const possiblePaths = [
        // 开发环境
        path.join(process.cwd(), 'node_modules/material-icon-theme/icons', iconName),
        // 打包后
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

  createWindow(pathToOpen);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(pathToOpen);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});