// src/index.ts

import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200, // 宽度调大一些
    height: 800, // 高度调大一些
    webPreferences: {
      // 这里的 __dirname 指向 'dist/main' 目录
      preload: path.join(__dirname, 'preload.js'),
      // contextIsolation 必须为 true (默认值)，这是 contextBridge 安全性的保障
      contextIsolation: true,
      // 为了安全，nodeIntegration 应该为 false (默认值)
      nodeIntegration: false,
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