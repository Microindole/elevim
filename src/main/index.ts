// src/main/index.ts
import { app, BrowserWindow, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initRpcHandler, registerService } from './utils/rpc-handler';
import { parseCliArguments } from './cli/cli-handler';
import { CliAction } from './cli/cli-action.types';
import { getWindowState, saveWindowState } from './lib/session';

// 导入所有服务
import { FileService } from './services/file.service';
import { GitService } from './services/git.service';
import { TerminalService } from './services/terminal.service';
import { SettingsService } from './services/settings.service';
import { WindowService } from './services/window.service';
import { MenuService } from './services/menu.service';
import { GitHubService } from './services/github.service';
import { SessionService } from './services/session.service';
import { LspService } from './services/lsp.service';
import { CliService } from './services/cli.service';
import { readDirectory } from './lib/file-system';

const cliAction: CliAction = parseCliArguments(process.argv);

if (cliAction.type === 'exit-fast') {
  if (cliAction.isError) console.error(cliAction.message);
  else console.log(cliAction.message);
  app.quit();
}

// Protocol 注册
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('elevim', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('elevim');
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isMinimized()) windows[0].restore();
      windows[0].focus();
    }
  });
}

function setupServices(mainWindow: BrowserWindow) {
  // 1. 初始化 RPC 基础
  initRpcHandler();

  // 2. 实例化服务
  const fileService = new FileService(mainWindow);
  const gitService = new GitService(fileService);
  const terminalService = new TerminalService(mainWindow, fileService);
  const settingsService = new SettingsService(mainWindow);
  const windowService = new WindowService(mainWindow);
  const menuService = new MenuService(fileService);
  const githubService = new GitHubService(mainWindow);
  const sessionService = new SessionService(fileService);
  const lspService = new LspService(mainWindow);
  const cliService = new CliService();

  // 3. 注册服务
  registerService('file', fileService);
  registerService('git', gitService);
  registerService('terminal', terminalService);
  registerService('settings', settingsService);
  registerService('window', windowService);
  registerService('menu', menuService);
  registerService('github', githubService);
  registerService('session', sessionService);
  registerService('lsp', lspService);
  registerService('cli', cliService);

  return { cliService };
}

async function createWindow() {
  const state = getWindowState();
  const mainWindow = new BrowserWindow({
    x: state.x, y: state.y, width: state.width, height: state.height,
    icon: path.join(app.getAppPath(), 'resources/logo.png'),
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  if (state.isMaximized) mainWindow.maximize();
  mainWindow.on('close', () => saveWindowState(mainWindow));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile('index.html');

  // 启动服务
  const { cliService } = setupServices(mainWindow);

  // 处理 CLI 启动参数
  mainWindow.webContents.on('did-finish-load', async () => {
    if (cliAction.type === 'start-gui-open-folder') {
      const tree = await readDirectory(cliAction.folderPath);
      cliService.emit('open-folder', {
        name: path.basename(cliAction.folderPath),
        path: cliAction.folderPath,
        children: tree
      });
    } else if (cliAction.type === 'start-gui-open-file') {
      const content = await fs.promises.readFile(cliAction.filePath, 'utf-8');
      cliService.emit('open-file', { content, filePath: cliAction.filePath });
    }
  });
}

app.whenReady().then(() => {
  protocol.registerStringProtocol('elevim', (request, callback) => callback('OK'));

  // Material Icon Protocol
  protocol.registerFileProtocol('material-icon', (request, callback) => {
    const iconName = request.url.replace('material-icon://', '');
    const p = path.join(app.getAppPath(), 'node_modules/material-icon-theme/icons', iconName);
    callback({ path: p });
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});