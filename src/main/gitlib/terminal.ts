import { BrowserWindow } from 'electron';
import * as pty from 'node-pty';

let ptyProcess: pty.IPty | null = null;

// TODO: Hit spawn hard to see if you can repro the "posix_spawnp failed" error
// TODO: Try seeing if forking works to contain the spawned instance?
export const spawnTerminal = async ({
  cmd,
  dir,
  mainWindow,
}: {
  cmd: string;
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
  ptyProcess = pty.spawn('bash', ['-c', cmd], {
    name: 'xterm-color',
    cols: 80,
    rows: 10,
    cwd: dir,
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

export const terminalIn = (str: string) => {
  ptyProcess?.write(str);
};
