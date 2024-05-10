import fs from 'fs';
import { BrowserWindow } from 'electron';
import { customAlphabet } from 'nanoid';
import git from 'isomorphic-git';
import { TreeCommit } from '../../types/types';
import { getLatestTree, reloadGitTree } from './git-tree';
import { sleep } from '../util';
import { rebaseInProgress } from './git-read';
import {
  rebaseInitialFrom,
  rebaseStatusInProgress,
  setRebaseInitialTo as setRebaseInitialFrom,
  setRebaseStatus,
} from './activity-status';
import { TEMP_BRANCH_PREFIX } from '../../types/consts';
import { spawnTerminal } from './terminal';
import { getCwd } from '../app-settings';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);

type BranchRename = {
  tempBranchName: string;
  goalBranches: string[];
};

export const abortRebase = async ({
  mainWindow,
}: {
  mainWindow: BrowserWindow;
}) => {
  const dir = await getCwd();
  if (!dir) {
    return;
  }

  setRebaseStatus('cancel-requested');

  await spawnTerminal({
    command: { cmd: 'git', args: ['rebase', '--abort'] },
    dir,
    mainWindow,
  });

  // Delete any tmp branches around
  const branches = await git.listBranches({ fs, dir });
  const branchesToDelete = branches.filter((branch) =>
    branch.startsWith(TEMP_BRANCH_PREFIX),
  );
  if (branchesToDelete.length > 0) {
    await spawnTerminal({
      command: { cmd: 'git', args: ['checkout', 'head'] },
      dir,
      mainWindow,
    });
    await spawnTerminal({
      command: { cmd: 'git', args: ['branch', '-D', ...branchesToDelete] },
      dir,
      mainWindow,
    });
  }

  await spawnTerminal({
    command: {
      cmd: 'git',
      args: [
        '-c',
        'advice.detachedHead=false',
        'checkout',
        rebaseInitialFrom(),
      ],
    },
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

  const dir = await getCwd();
  if (!dir) {
    return;
  }
  // TODO: Handle situation when a commit in the graph has no branch
  // TODO: Handle situation when a commit has multiple branches
  const tempBranchName = `${TEMP_BRANCH_PREFIX}${nanoid()}`;
  await spawnTerminal({
    command: {
      cmd: 'git',
      args: ['branch', '--no-track', tempBranchName, from.metadata.oid],
    },
    dir,
    mainWindow,
  });

  branchRenames.push({
    tempBranchName,
    goalBranches: from.metadata.branches.map(x => x.branchName),
  });

  const fromBranch = tempBranchName;
  const returnValue = await spawnTerminal({
    command: {
      cmd: 'git',
      args: ['rebase', '--onto', to, `${fromBranch}~`, fromBranch],
    },
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
  const dir = await getCwd();
  if (!dir) {
    return;
  }

  const tree = getLatestTree();

  setRebaseStatus('in-progress');
  setRebaseInitialFrom(from.metadata.oid);

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
      await spawnTerminal({
        command: {
          cmd: 'git',
          args: ['branch', '--force', goalBranch, tempBranchName],
        },
        dir,
        mainWindow,
      });
    }

    // This checks out the commit of the temp branch, so it's not on the branch
    // eslint-disable-next-line no-await-in-loop
    await spawnTerminal({
      command: {
        cmd: 'git',
        args: ['checkout', tempBranchName],
      },
      dir,
      mainWindow,
    });
    // eslint-disable-next-line no-await-in-loop
    await spawnTerminal({
      command: {
        cmd: 'git',
        args: ['checkout', 'head'],
      },
      dir,
      mainWindow,
    });

    // Don't want to delete the branch if the commit will disappear
    if (from.metadata.branches.length > 0 || from.branchSplits.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await spawnTerminal({
        command: {
          cmd: 'git',
          args: ['branch', '-D', tempBranchName],
        },
        dir,
        mainWindow,
      });
    }
  }

  const finalCheckout = tree?.currentBranchName ?? from.metadata.branches[0]?.branchName;
  if (finalCheckout) {
    await spawnTerminal({
      command: {
        cmd: 'git',
        args: ['checkout', finalCheckout],
      },
      dir,
      mainWindow,
    });
  }

  setRebaseStatus('stopped');
  await reloadGitTree({ mainWindow });
};
