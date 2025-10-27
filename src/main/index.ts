
import { app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'node:fs/promises'; // 引入 Node.js 的文件系统模块
import { IPC_CHANNELS } from '../shared/constants'; // 引入我们定义的常量

// 将 mainWindow 提升到函数外部，以便在菜单的 click 事件中访问
let mainWindow: BrowserWindow | null;
let currentFilePath: string | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log(`[Main Process] Preload script path: ${preloadPath}`);
  mainWindow = new BrowserWindow({ // 注意这里不再使用 const
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();

  // 窗口关闭时清空引用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- 处理 IPC: 保存文件 ---
ipcMain.handle(IPC_CHANNELS.SAVE_FILE, async (_event, content: string): Promise<string | null> => {
  // 如果没有当前文件路径，则触发“另存为”
  if (currentFilePath === null) {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save File As',
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (canceled || !filePath) {
      return null; // 用户取消，返回 null
    }
    currentFilePath = filePath;
  }

  try {
    await fs.writeFile(currentFilePath, content, 'utf-8');
    // 可选：在这里可以发送一个 'file-saved' 消息回渲染进程
    // mainWindow?.webContents.send(IPC_CHANNELS.FILE_SAVED, currentFilePath);
    return currentFilePath; // 保存成功，返回路径
  } catch (error) {
    console.error('Failed to save file:', error);
    return null; // 保存失败，返回 null
  }
});

// --- 处理 IPC: 设置窗口标题 ---
ipcMain.on(IPC_CHANNELS.SET_TITLE, (_event, title: string) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});

// --- 创建应用菜单 ---
const menuTemplate: MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Open File...',
        accelerator: 'CmdOrCtrl+O',
        async click() {
          const { canceled, filePaths } = await dialog.showOpenDialog({ /* ... */ });
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
        }
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click() {
          // 这个点击事件只是一个触发器，真正的逻辑在渲染进程
          // 我们让渲染进程把内容发过来
          mainWindow?.webContents.send('trigger-save-file');
        }
      },
      {
        label: 'Save As...',
        accelerator: 'CmdOrCtrl+Shift+S',
        click() {
          // 另存为总是强制弹出对话框，所以我们先清空当前路径
          currentFilePath = null;
          mainWindow?.webContents.send('trigger-save-file');
        }
      },
      {
        type: 'separator' // 分割线
      },
      {
        role: 'quit' // 使用内置的退出角色
      }
    ]
  },
  // 你可以在这里添加更多的菜单项，比如 'Edit', 'View' 等
];

app.whenReady().then(() => {
  // 从模板构建菜单
  const menu = Menu.buildFromTemplate(menuTemplate);
  // 设置为应用菜单
  Menu.setApplicationMenu(menu);

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