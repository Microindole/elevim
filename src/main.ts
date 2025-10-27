// src/main.ts

import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200, // 宽度调大一些
    height: 800, // 高度调大一些
    webPreferences: {
      // preload 脚本依然很重要，虽然我们暂时没用它做太多事
    //   preload: path.join(__dirname, 'preload.ts'),
      // 注意：在较新的 Electron 版本中，为了安全，默认是隔离的。
      // nodeIntegration: false,
      // contextIsolation: true,
    }
  });

  // 加载 index.html
  mainWindow.loadFile('index.html');

  // 打开开发者工具，方便调试
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
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