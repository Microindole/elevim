// src/main/index.ts
import { app, BrowserWindow, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { registerIpcHandlers } from './ipc-handlers';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(app.getAppPath(), 'resources/logo-me.png'),
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

  mainWindow.on('closed', () => {
    // 在这里我们不需要设置 mainWindow = null，因为闭包会处理好
  });
}

app.whenReady().then(() => {
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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});