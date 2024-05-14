import { BrowserWindow } from 'electron';
import { isNil, omitBy, pickBy } from 'lodash';
import * as pty from 'node-pty';
import { Command } from '../../types/types';
import { sleep } from '../main-util';

let ptyProcess: pty.IPty | null = null;

/**
 * NOTE: This is only used for display purposes, it's not actually piped into bash
 */
export const escapeShellArg = (arg: string) => {
    const simpleArg = /^[a-zA-Z\d-.]*$/;
    if (simpleArg.exec(arg)) {
        return arg;
    }
    return `'${arg.replace(/'/g, `'\\''`)}'`;
};

const spawnTerminalHelper = async ({
    command: { cmd, args },
    dir,
    mainWindow,
}: {
    command: Command;
    dir: string;
    mainWindow: BrowserWindow;
}): Promise<{ out?: string; returnCode: number }> => {
    if (ptyProcess) {
        // TODO Lock instead
        console.log('Error: Process already running!');
        return { returnCode: -1 };
    }

    // const shPath = await shellPath();
    ptyProcess = pty.spawn(cmd, args, {
        name: 'xterm-color',
        cols: 80,
        rows: 10,
        cwd: dir,
        env: {
            ...process.env,
            // Forces language to English
            // Needed for automatic processing (e.g. to retry if lock exists)
            LC_ALL: 'C',
        },
        // TODO: Fix path
        // env: process.env,
    });

    mainWindow?.webContents.send(
        'terminal-out',
        `${cmd} ${args.map((arg) => escapeShellArg(arg)).join(' ')}\r\n`,
    );

    const outObj = { out: '' };

    ptyProcess.onData((ptyData) => {
        mainWindow?.webContents.send('terminal-out', ptyData);
        outObj.out += ptyData;
    });

    const ptyProcessFinal = ptyProcess;
    return new Promise((resolve) => {
        ptyProcessFinal.onExit((x) => {
            mainWindow?.webContents.send('terminal-out', '\r\n> ');
            ptyProcess = null;
            const result = {
                returnCode: x.exitCode,
                out: outObj.out,
            };
            resolve(result);
        });
    });
};

export const spawnTerminal = async ({
    command,
    dir,
    mainWindow,
}: {
    command: Command;
    dir: string;
    mainWindow: BrowserWindow;
}): Promise<{ out?: string; returnCode: number }> => {
    let retries = 3;
    let result: { out?: string; returnCode: number } | null = null;
    while (retries > 0) {
        // eslint-disable-next-line no-await-in-loop
        result = await spawnTerminalHelper({
            command,
            dir,
            mainWindow,
        });

        if (result.returnCode === 0) {
            return result;
        }

        await sleep(300);

        if (
            result.out?.includes(
                'Another git process seems to be running in this repository',
            )
        ) {
            console.log('Lock exists, retrying...');
        } else {
            console.log(`Error, retrying... (${retries} remaining`);
            retries--;
        }
    }
    return result ?? { returnCode: -1 };
};

export const terminalIn = (str: string) => {
    ptyProcess?.write(str);
};

export const terminalOut = ({
    str,
    mainWindow,
}: {
    str: string;
    mainWindow: BrowserWindow;
}) => {
    mainWindow?.webContents.send('terminal-out', str);
};

export const fakeCommand = ({
    cmd,
    mainWindow,
}: {
    cmd: string;
    mainWindow: BrowserWindow;
}) => {
    terminalOut({ mainWindow, str: `${cmd}\r\n\r\n> ` });
};
