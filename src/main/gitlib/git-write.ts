import util from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import { BrowserWindow, ipcMain } from 'electron';
import * as pty from 'node-pty';
import os from 'os';
import { customAlphabet } from 'nanoid';
import git from 'isomorphic-git';
import { RebaseStatus, TreeCommit } from '../../types/types';
import { extractGitTree, reloadGitTree } from './git-tree';
import { sleep } from '../util';
import { rebaseInProgress } from './git-read';
import {
  rebaseInitialFrom,
  rebaseStatusInProgress,
  setRebaseInitialTo as setRebaseInitialFrom,
  setRebaseStatus,
} from './activity-status';
import { TEMP_BRANCH_PREFIX } from '../../types/consts';

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

type BranchRename = {
  tempBranchName: string;
  goalBranches: string[];
};

export const abortRebase = async ({
  mainWindow,
}: {
  mainWindow: BrowserWindow;
}) => {
  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo'; // TODO

  setRebaseStatus('cancel-requested');

  await spawn({ cmd: 'git rebase --abort', dir, mainWindow });

  // Delete any tmp branches around
  const branches = await git.listBranches({ fs, dir });
  const branchesToDelete = branches.filter((branch) =>
    branch.startsWith(TEMP_BRANCH_PREFIX),
  );
  if (branchesToDelete.length > 0) {
    await spawn({
      cmd: 'git checkout head',
      dir,
      mainWindow,
    });
    await spawn({
      cmd: `git branch -D ${branchesToDelete.join(' ')}`,
      dir,
      mainWindow,
    });
  }

  await spawn({
    cmd: `git -c advice.detachedHead=false checkout ${rebaseInitialFrom()}`,
    dir,
    mainWindow,
  });

  setRebaseStatus('stopped');
  await reloadGitTree({ mainWindow });
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
  if (!rebaseStatusInProgress()) {
    return;
  }

  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo'; // TODO
  // TODO: Handle situation when a commit in the graph has no branch
  // TODO: Handle situation when a commit has multiple branches
  const tempBranchName = `${TEMP_BRANCH_PREFIX}${nanoid()}`;
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
      if (!rebaseStatusInProgress()) {
        return;
      }

      await reloadGitTree({ mainWindow });
      const rebasing = await rebaseInProgress(dir);
      if (!rebasing) {
        waitingForRebaseComplete = false;
      } else {
        await sleep(500);
      }
    }
  }

  if (!rebaseStatusInProgress()) {
    return;
  }

  await reloadGitTree({ mainWindow });

  for (const split of from.branchSplits) {
    if (!rebaseStatusInProgress()) {
      return;
    }
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
  setRebaseStatus('in-progress');
  setRebaseInitialFrom(from.metadata.oid);

  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo'; // TODO
  const branchRenames: BranchRename[] = [];
  await performRebaseHelper({ from, to, branchRenames, mainWindow });

  // console.log('performRebase', {status: rebaseStatus()});
  if (!rebaseStatusInProgress()) {
    return;
  }

  // This ends us at the originally selected commit
  branchRenames.reverse();

  for (const { goalBranches, tempBranchName } of branchRenames) {
    for (const goalBranch of goalBranches) {
      // eslint-disable-next-line no-await-in-loop
      await spawn({
        cmd: `git branch --force ${goalBranch} ${tempBranchName}`,
        dir,
        mainWindow,
      });
    }

    // This checks out the commit of the temp branch, so it's not on the branch
    // eslint-disable-next-line no-await-in-loop
    await spawn({
      cmd: `git checkout ${tempBranchName} && git checkout head`,
      dir,
      mainWindow,
    });

    // Don't want to delete the branch if the commit will disappear
    if (from.metadata.branches.length > 0 || from.branchSplits.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await spawn({ cmd: `git branch -D ${tempBranchName}`, dir, mainWindow });
    }
  }

  setRebaseStatus('stopped');
  await reloadGitTree({ mainWindow });
};

export const terminalIn = (str: string) => {
  ptyProcess?.write(str);
};
