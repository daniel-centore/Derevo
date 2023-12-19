/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import electron, { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import os from 'os';
// import pty from 'node-pty';
// import pty from '@homebridge/node-pty-prebuilt-multiarch';
import { exec } from 'child_process';
import util from 'node:util';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { extractGitTree } from './gitlib/git-tree';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('extractGitTree', async (event, data) => {
  const result = await extractGitTree();
  console.log('Responding...', { mainWindow: !!mainWindow });
  // return result;
  mainWindow?.webContents.send('extractGitTree', result);
});

ipcMain.handle('checkout', async (event, data) => {
  console.log('Checkout', { data });
  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo';
  const execPromise = util.promisify(exec);
  await execPromise(`git checkout ${data[0]}`, { cwd: dir });
  // await git.checkout({
  //   fs,
  //   dir,
  //   ref: data,
  // });
  // const platformShell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  // const ptyProcess = pty.spawn(platformShell, [], {
  //   name: 'xterm-color',
  //   cols: 80,
  //   rows: 24,
  //   cwd: process.env.HOME,
  //   env: process.env,
  // });
  // // ptyProcess.

  // ptyProcess.onData((ptyData) => {
  //    mainWindow?.webContents.send('terminal-incData', ptyData);
  // });

  // ipcMain.on('terminal-into', (_event, ptyData) => {
  //   ptyProcess.write(ptyData);
  // });

  const result = await extractGitTree();
  mainWindow?.webContents.send('extractGitTree', result);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// if (isDebug) {
//   require('electron-debug')();
// }

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  const image = electron.nativeImage.createFromPath(getAssetPath('icon.png'));
  app.dock.setIcon(image);

  mainWindow = new BrowserWindow({
    show: false,
    width: 1000,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) {
        createWindow();
      }
    });
  })
  .catch(console.log);
