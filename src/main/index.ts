// src/main/index.ts

// 1. 从 'electron' 的导入中移除 Menu 和 MenuItemConstructorOptions，因为我们不再需要它们了
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'node:fs/promises';
import { IPC_CHANNELS } from '../shared/constants';

let mainWindow: BrowserWindow | null;
let currentFilePath: string | null = null;

function createWindow() {
  // ... createWindow 函数的代码完全保持不变
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log(`[Main Process] Preload script path: ${preloadPath}`);
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(app.getAppPath(), 'resources/icon.png'), // 我帮你修正了图标路径，先假设它在根目录的 resources 下
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
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- IPC 监听器区域 ---

// handle 'save-file' (已存在，保持不变)
ipcMain.handle(IPC_CHANNELS.SAVE_FILE, async (_event, content: string): Promise<string | null> => {
  // ... 这部分代码完全保持不变
  if (currentFilePath === null) {
    const { canceled, filePath } = await dialog.showSaveDialog({ /* ... */ });
    if (canceled || !filePath) return null;
    currentFilePath = filePath;
  }
  try {
    await fs.writeFile(currentFilePath, content, 'utf-8');
    return currentFilePath;
  } catch (error) {
    console.error('Failed to save file:', error);
    return null;
  }
});

// on 'set-title'
ipcMain.on(IPC_CHANNELS.SET_TITLE, (_event, title: string) => { /* ... */ });

// --- 处理 IPC: 窗口控制 ---
ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
  mainWindow?.minimize(); // <--- 使用 ?.
});

ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
  if (mainWindow?.isMaximized()) { // <--- 使用 ?.
    mainWindow?.unmaximize();     // <--- 使用 ?.
  } else {
    mainWindow?.maximize();       // <--- 使用 ?.
  }
});

ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
  mainWindow?.close();          // <--- 使用 ?.
});


// --- 处理 IPC: 来自渲染进程的菜单项请求 ---

// 对应 "New File"
ipcMain.on(IPC_CHANNELS.NEW_FILE, () => {
  currentFilePath = null;
  // 直接通知渲染进程执行后续操作
  mainWindow?.webContents.send(IPC_CHANNELS.NEW_FILE);
});

// 对应 "Open File..."
ipcMain.on(IPC_CHANNELS.SHOW_OPEN_DIALOG, async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'html', 'css'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (!canceled && filePaths.length > 0) {
    currentFilePath = filePaths[0];
    try {
      const content = await fs.readFile(currentFilePath, 'utf-8');
      mainWindow?.webContents.send(IPC_CHANNELS.FILE_OPENED, {
        content: content,
        filePath: currentFilePath
      });
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  }
});

// 对应 "Save" 和 "Save As..."
// 这两个功能都是通过向渲染进程发送 'trigger-save-file' 来启动的
ipcMain.on('trigger-save-file', () => {
  mainWindow?.webContents.send('trigger-save-file');
});
ipcMain.on('trigger-save-as-file', () => {
  currentFilePath = null; // 另存为的核心是清空当前路径
  mainWindow?.webContents.send('trigger-save-file');
});






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