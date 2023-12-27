import util from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import { BrowserWindow, ipcMain } from 'electron';
import * as pty from 'node-pty';
import os from 'os';
import { customAlphabet } from 'nanoid';
import { TreeCommit } from '../../types/types';
import { extractGitTree, reloadGitTree } from './git-tree';
import { sleep } from '../util';
import { rebaseInProgress } from './git-read';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);

export const commit = () => {
  // git checkout -b testing-branch
  // git add .
  // git commit -m "Created a commit"
  // checkout a new branch
  // git add (selected changes)
  // git commit
};

export const uncommit = () => {
  // checkout parent commit hash
  // delete unused branch (local & remote)
  // soft reset HEAD~1
  // checkout current branch
};

export const amend = () => {
  // git add (selected changes)
  // git amend
  // git rebase all the children commit to the newly amended commit
};

const executeCommand = async (dir: string, cmd: string) => {
  const execPromise = util.promisify(exec);
  const { stdout, stderr } = await execPromise(`git checkout ${cmd}`, {
    cwd: dir,
  });
};

let ptyProcess: pty.IPty | null = null;

// TODO: Hit spawn hard to see if you can repro the "posix_spawnp failed" error
export const spawn = async ({
  cmd,
  dir,
  mainWindow,
}: {
  cmd: string;
  dir: string;
  mainWindow: BrowserWindow;
}): Promise<number> => {
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

type BranchRename = {
  tempBranchName: string;
  goalBranches: string[];
};

const performRebaseHelper = async ({
  from,
  to,
  branchRenames,
  mainWindow,
}: {
  from: TreeCommit;
  to: string;
  branchRenames: BranchRename[];
  mainWindow: BrowserWindow;
}) => {
  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo'; // TODO
  // TODO: Handle situation when a commit in the graph has no branch
  // TODO: Handle situation when a commit has multiple branches
  const tempBranchName = `derevo-${nanoid()}`;
  await spawn({
    cmd: `git branch --no-track ${tempBranchName} ${from.metadata.oid}`,
    dir,
    mainWindow,
  });

  branchRenames.push({
    tempBranchName,
    goalBranches: from.metadata.branches,
  });

  const fromBranch = tempBranchName;
  const returnValue = await spawn({
    cmd: `git rebase --onto ${to} ${fromBranch}~ ${fromBranch}`,
    dir,
    mainWindow,
  });
  if (returnValue !== 0) {
    let waitingForRebaseComplete = true;
    while (waitingForRebaseComplete) {
      const rebasing = await rebaseInProgress(dir);
      if (!rebasing) {
        waitingForRebaseComplete = false;
      } else {
        await sleep(500);
      }
    }
    // TODO: Wait for "Continue"
    // await spawn('git add .', dir);
    // await spawn('git -c core.editor=true rebase --continue', dir);
  }

  await reloadGitTree({ mainWindow });

  for (const split of from.branchSplits) {
    if (split.type !== 'commit') {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await performRebaseHelper({
      from: split,
      to: fromBranch,
      branchRenames,
      mainWindow,
    });
  }
};

export const performRebase = async ({
  mainWindow,
  from,
  to,
}: {
  mainWindow: BrowserWindow;
  from: TreeCommit;
  to: string;
}) => {
  // TODO: When rebasing in such a way that a commit underneath the branch would disappear,
  // assign that commit a random branch name
  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo'; // TODO
  const branchRenames: BranchRename[] = [];
  await performRebaseHelper({ from, to, branchRenames, mainWindow });
  for (const { goalBranches, tempBranchName } of branchRenames) {
    for (const goalBranch of goalBranches) {
      // eslint-disable-next-line no-await-in-loop
      await spawn({
        cmd: `git branch --force ${goalBranch} ${tempBranchName}`,
        dir,
        mainWindow,
      });
    }
    // eslint-disable-next-line no-await-in-loop
    await spawn({
      cmd: `git -c advice.detachedHead=false checkout ${to}`,
      dir,
      mainWindow,
    });

    // Don't want to delete the branch if the commit will disappear
    if (from.metadata.branches.length > 0 || from.branchSplits.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await spawn({ cmd: `git branch -D ${tempBranchName}`, dir, mainWindow });
    }
  }
  await reloadGitTree({ mainWindow });
};

export const terminalIn = (str: string) => {
  ptyProcess?.write(str);
}
