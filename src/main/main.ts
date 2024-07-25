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
import electron, { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
// import { shellPath } from 'shell-path';
// import trash from 'trash';
import { unlink } from 'node:fs';
import util from 'util';
import { head } from 'lodash';
import fs from 'fs';
import MenuBuilder from './menu';
import { resolveHtmlPath, sleep } from './main-util';
import { autoReloadGitTree, reloadGitTree } from './gitlib/git-tree';
import { abortRebase, performRebase } from './gitlib/git-write';
import { Command, TreeCommit } from '../types/types';
import {
    escapeShellArg,
    fakeCommand,
    spawnTerminal,
    terminalIn,
} from './gitlib/terminal';
import { getCwd, setCwd, setGithubAuthentication } from './app-settings';
import { authGithub, autoReloadGithub, reloadGithub } from './gitlib/github';

class AppUpdater {
    constructor() {
        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        autoUpdater.checkForUpdatesAndNotify();
    }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('get-folder', async () => {
    if (!mainWindow) {
        return undefined;
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    if (canceled) {
        return undefined;
    }
    return head(filePaths);
});

ipcMain.handle('set-cwd', async (_, data) => {
    if (!mainWindow) {
        return;
    }
    await setCwd(data);
    await reloadGitTree({ mainWindow });
});

ipcMain.handle('auth-github', async () => {
    if (!mainWindow) {
        return;
    }
    await authGithub({ mainWindow });
});

ipcMain.handle('reload-github', async (_, data) => {
    if (!mainWindow) {
        return;
    }
    await reloadGithub({ mainWindow });
});

ipcMain.handle('logout-github', async () => {
    if (!mainWindow) {
        return;
    }
    await setGithubAuthentication(null);
});

ipcMain.handle('extract-git-tree', async () => {
    if (!mainWindow) {
        return;
    }
    await reloadGitTree({ mainWindow });
});

ipcMain.handle('stress-test', async () => {
    if (!mainWindow) {
        return;
    }
    for (let i = 1; i <= 100; i++) {
        await spawnTerminal({
            command: { cmd: 'echo', args: [`hello ${i}`] },
            dir: '/Users/dcentore/Desktop/',
            mainWindow,
        });
    }
});

ipcMain.handle('open-external', async (_event, data) => {
    await shell.openExternal(data, { activate: true });
});

ipcMain.handle('run-cmds', async (_event, data) => {
    const dir = await getCwd();

    if (!mainWindow || !dir) {
        return -1;
    }

    for (const command of data as Command[]) {
        // eslint-disable-next-line no-await-in-loop
        const result = await spawnTerminal({
            command,
            dir,
            mainWindow,
        });
        if (result.returnCode !== 0) {
            return result.returnCode;
        }

        // eslint-disable-next-line no-await-in-loop
        await reloadGitTree({ mainWindow });
    }

    return 0;
});

ipcMain.handle('delete', async (_, files: string[]) => {
    const dir = await getCwd();

    if (!mainWindow || files.length === 0) {
        return;
    }

    const unlinkPromise = util.promisify(unlink);
    await Promise.all(files.map((file) => unlinkPromise(`${dir}/${file}`)));

    fakeCommand({
        mainWindow,
        cmd: `rm ${files.map((file) => escapeShellArg(file)).join(' ')}`,
    });

    await reloadGitTree({ mainWindow });
});

ipcMain.handle('rebase', async (_, data) => {
    if (!mainWindow) {
        return null;
    }

    const {
        from,
        to,
        skipFirstRebase,
    }: { from: TreeCommit; to: string; skipFirstRebase: boolean } = data;

    return performRebase({ from, to, mainWindow, skipFirstRebase });
});

ipcMain.handle('abort-rebase', async () => {
    if (!mainWindow) {
        return;
    }

    await abortRebase({ mainWindow });
});

ipcMain.handle('terminal-in', (_event, ptyData) => {
    terminalIn(ptyData[0]);
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

    autoReloadGitTree({ mainWindow });
    autoReloadGithub({ mainWindow });

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

app.whenReady()
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
