import { BrowserWindow } from 'electron';
import { isNil, omitBy, pickBy } from 'lodash';
import * as pty from 'node-pty';
import { Command } from '../../types/types';

let ptyProcess: pty.IPty | null = null;

/**
 * NOTE: This is only used for display purposes, it's not actually piped into bash
 */
const escapeShellArg = (arg: string) => {
  const simpleArg = /^[a-zA-Z\d-]*$/;
  if (simpleArg.exec(arg)) {
    return arg;
  }
  return `'${arg.replace(/'/g, `'\\''`)}'`;
};

// TODO: Hit spawn hard to see if you can repro the "posix_spawnp failed" error
// TODO: Try seeing if forking works to contain the spawned instance?
export const spawnTerminal = async ({
  command: { cmd, args },
  dir,
  mainWindow,
}: {
  command: Command;
  dir: string;
  mainWindow: BrowserWindow;
}): Promise<number> => {
  if (ptyProcess) {
    // TODO Lock instead
    console.log('Error: Process already running!');
    // ptyProcess.onExit(() => {
    //   spawn(cmd, cwd);
    // });
    return -1;
  }

  // const shPath = await shellPath();
  ptyProcess = pty.spawn(cmd, args, {
    name: 'xterm-color',
    cols: 80,
    rows: 10,
    cwd: dir,
    // TODO: Fix path
    // env: process.env,
  });

  mainWindow?.webContents.send(
    'terminal-out',
    `${cmd} ${args.map((arg) => escapeShellArg(arg)).join(' ')}\r\n`,
  );

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

export const terminalIn = (str: string) => {
  ptyProcess?.write(str);
};
