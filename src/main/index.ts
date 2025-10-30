// src/main/index.ts
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerIpcHandlers, initializeServices } from './ipc-handlers';

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
  mainWindow.webContents.openDevTools();

  // 将 mainWindow 实例传递给 IPC 处理器注册函数
  registerIpcHandlers(mainWindow);

  mainWindow.on('closed', () => {
    // 在这里我们不需要设置 mainWindow = null，因为闭包会处理好
  });
}

app.whenReady().then(async () => {
  // 初始化所有语言的 Linters (包括 JavaScript, TypeScript, Python, JSON, CSS, HTML)
  console.log('[Main] Initializing multi-language linters...');
  await initializeServices();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 不需要特殊的清理代码，linters 会自动销毁
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});