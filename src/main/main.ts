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
// import { shellPath } from 'shell-path';
import * as pty from 'node-pty';
import { exec } from 'child_process';
import util from 'node:util';
import { customAlphabet } from 'nanoid';
import MenuBuilder from './menu';
import { resolveHtmlPath, sleep } from './util';
import { extractGitTree } from './gitlib/git-tree';
import { TreeCommit } from '../types/types';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 10);

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

const reloadGitTree = async () => {
  const result = await extractGitTree();
  console.log('Responding...', { mainWindow: !!mainWindow });
  // return result;
  mainWindow?.webContents.send('extractGitTree', result);
};

// TODO: rename
ipcMain.handle('extractGitTree', async (event, data) => {
  await reloadGitTree();
});

let ptyProcess: pty.IPty | null = null;

const spawn = async (cmd: string, cwd: string): Promise<number> => {
  if (ptyProcess) {
    console.log('Error: Process already running!');
    // ptyProcess.onExit(() => {
    //   spawn(cmd, cwd);
    // });
    return -1;
  }

  // const shPath = await shellPath();
  const platformShell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  ptyProcess = pty.spawn(platformShell, ['-c', cmd], {
    name: 'xterm-color',
    cols: 80,
    rows: 10,
    cwd,
    // TODO: Fix path
    env: { ...process.env },
  });

  mainWindow?.webContents.send('terminal-out', `${cmd}\r\n`);

  ptyProcess.onData((ptyData) => {
    console.log({ ptyData });
    mainWindow?.webContents.send('terminal-out', ptyData);
  });

  const ptyProcessFinal = ptyProcess;
  return new Promise<number>((resolve) => {
    ptyProcessFinal.onExit((x) => {
      mainWindow?.webContents.send('terminal-out', '\r\n> ');
      ptyProcess = null;
      resolve(x.exitCode);
    });
  });
};

ipcMain.handle('terminal-in', (_event, ptyData) => {
  ptyProcess?.write(ptyData[0]);
});

// Rebase git -c core.editor=true rebase --continue
ipcMain.handle('run-cmds', async (event, data) => {
  console.log('run-cmds', { data });
  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo'; // TODO

  for (const cmd of data as string[]) {
    // await spawn(`git -c advice.detachedHead=false checkout ${data[0]}`, dir);
    // eslint-disable-next-line no-await-in-loop
    await spawn(cmd, dir);

    // eslint-disable-next-line no-await-in-loop
    const result = await extractGitTree();
    mainWindow?.webContents.send('extractGitTree', result);
  }
  // await spawn('vim', dir);
});

type BranchRename = {
  tempBranchName: string;
  goalBranches: string[];
};

const performRebaseHelper = async ({
  from,
  to,
  branchRenames,
}: {
  from: TreeCommit;
  to: string;
  branchRenames: BranchRename[];
}) => {
  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo'; // TODO
  // TODO: Handle situation when a commit in the graph has no branch
  // TODO: Handle situation when a commit has multiple branches
  const tempBranchName = `tmp-${nanoid()}`;
  await spawn(
    `git branch --no-track ${tempBranchName} ${from.metadata.oid}`,
    dir,
  );

  branchRenames.push({
    tempBranchName,
    goalBranches: from.metadata.branches,
  });

  const fromBranch = tempBranchName;
  const returnValue = await spawn(
    `git rebase --onto ${to} ${fromBranch}~ ${fromBranch}`,
    dir,
  );
  if (returnValue !== 0) {
    let hasConflict = true;
    while (hasConflict) {
      // TODO: Do something
      const execPromise = util.promisify(exec);
      // eslint-disable-next-line no-await-in-loop
      // await execPromise('git add .', { cwd: dir });

      try {
        // --find-renames
        // eslint-disable-next-line no-await-in-loop
        await execPromise('git diff --check', { cwd: dir });
      } catch (e) {
        console.log('Merge in progress...');
        // eslint-disable-next-line no-await-in-loop
        await sleep(500);
        continue;
      }

      console.log('Completed!');
      hasConflict = false;
    }
    // TODO: Wait for "Continue"
    await spawn('git add .', dir);
    await spawn('git -c core.editor=true rebase --continue', dir);
  }

  await reloadGitTree();

  for (const split of from.branchSplits) {
    if (split.type !== 'commit') {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await performRebaseHelper({ from: split, to: fromBranch, branchRenames });
  }
};

const performRebase = async ({
  from,
  to,
}: {
  from: TreeCommit;
  to: string;
}) => {
  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo'; // TODO
  const branchRenames: BranchRename[] = [];
  await performRebaseHelper({ from, to, branchRenames });
  for (const { goalBranches, tempBranchName } of branchRenames) {
    for (const goalBranch of goalBranches) {
      // eslint-disable-next-line no-await-in-loop
      await spawn(`git branch --force ${goalBranch} ${tempBranchName}`, dir);
    }
    // eslint-disable-next-line no-await-in-loop
    await spawn(`git -c advice.detachedHead=false checkout ${to}`, dir);

    // Don't want to delete the branch if the commit will disappear
    if (from.metadata.branches.length > 0 || from.branchSplits.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await spawn(`git branch -D ${tempBranchName}`, dir);
    }
  }
  await reloadGitTree();
};

ipcMain.handle('rebase', async (_, data) => {
  const { from, to }: { from: TreeCommit; to: string } = data;

  await performRebase({ from, to });
});

ipcMain.handle('git-pull', async () => {
  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo'; // TODO
  await spawn('git pull origin main', dir);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

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
    width: 950,
    height: 750,
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
