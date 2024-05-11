import fs from 'fs';
import git, { ReadCommitResult } from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import util from 'util';
import { exec } from 'child_process';
import { BrowserWindow } from 'electron';
import {
  Branch,
  ChangeType,
  CommitMetadata,
  TreeCommit,
  TreeData,
} from '../../types/types';
import { getModifiedFiles, rebaseInProgress } from './git-read';
import { rebaseStatus } from './activity-status';
import { getCwd } from '../app-settings';

// If you have a branch that's this large, that's your own fault
const MAX_BRANCH_DEPTH = 100;

let latestTree: TreeData | null;

export const getLatestTree = () => latestTree;

const rawCommitToMeta = ({
  rawCommit,
  branches,
  activeCommit,
  mainBranch,
}: {
  rawCommit: ReadCommitResult;
  branches: Branch[];
  activeCommit: string;
  mainBranch: boolean;
}): CommitMetadata => ({
  oid: rawCommit.oid,
  branches,
  title: `${rawCommit.commit.message.split('\n')[0]}`,
  active: rawCommit.oid === activeCommit,
  onMainBranch: mainBranch,
  authorTs: new Date(rawCommit.commit.author.timestamp * 1000),
  commitTs: new Date(rawCommit.commit.committer.timestamp * 1000),
});

const stashList = async ({ dir }: { dir: string }) => {
  const execPromise = util.promisify(exec);
  const { stdout: entries, stderr } = await execPromise('git stash list', {
    cwd: dir,
  });
  return entries
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
};

const getBranch = async ({
  branchName,
  remote,
  dir,
}: {
  branchName: string;
  remote: {
    remote: string;
    url: string;
  } | null;
  dir: string;
}): Promise<Branch> => {
  const execPromise = util.promisify(exec);
  let hasChangesFromRemote: boolean | null = null;
  if (remote) {
    const bashSafeBranch = branchName.replaceAll("'", "\\'");
    try {
      // eslint-disable-next-line no-await-in-loop
      const { stdout: changesFromRemote, stderr } = await execPromise(
        `git log '${remote.remote}/${bashSafeBranch}'..'${bashSafeBranch}'`,
        {
          cwd: dir,
        },
      );
      hasChangesFromRemote = !!changesFromRemote.trim();
    } catch (e) {
      // This is normal when the branch has no remote
    }
  }
  return {
    branchName,
    hasChangesFromRemote,
  };
};

const getBranchesForCommit = async ({
  oid,
  dir,
}: {
  oid: string;
  dir: string;
}) => {
  const execPromise = util.promisify(exec);
  const { stdout, stderr } = await execPromise(`git branch --contains ${oid}`, {
    cwd: dir,
  });
  return stdout.split('\n').map((x) => x.substring(2));
};

const extractGitTree = async (): Promise<TreeData | null> => {
  const dir = await getCwd();

  if (!dir) {
    // No directory has been selected yet
    return null;
  }

  const remotes = await git.listRemotes({ fs, dir });
  if (remotes.length > 1) {
    // TODO: Expose error message better
    console.log('Too many remotes');
    return null;
  }
  const remote = remotes.length > 0 ? remotes[0] : null;

  const branches = await git.listBranches({ fs, dir });

  let mainBranchName: string | undefined;
  if (branches.includes('master')) {
    mainBranchName = 'master';
  } else if (branches.includes('main')) {
    mainBranchName = 'main';
  }

  // TODO: Figure out how to make this work with private GH repos
  // if (remote) {
  //   const remoteInfo = await git.getRemoteInfo({
  //     http,
  //     url: remote.url,
  //   });
  //   if (remoteInfo.HEAD) {
  //     mainBranch = remoteInfo.HEAD;
  //   }
  // }

  if (!mainBranchName) {
    // TODO: Expose error message better
    console.log('No main branch identified');
    return null;
  }

  const currentBranch = await git.currentBranch({
    fs,
    dir,
    fullname: false,
  });

  const activeCommit = await git.resolveRef({
    fs,
    dir,
    ref: 'HEAD',
  });

  const commitMap: Record<string, TreeCommit> = {};
  let dirty = false;

  // let rootCommit: TreeCommit | null = null;

  const mainBranchOid = await git.resolveRef({
    fs,
    dir,
    ref: `refs/heads/${mainBranchName}`,
  });

  const mainBranchCommits: TreeCommit[] = [];

  const refs: (
    | { branch: string }
    | { oid: string; forceBranchName?: string }
  )[] = [
    // { branch: mainBranchName },
    { oid: mainBranchOid, forceBranchName: mainBranchName },
    { oid: activeCommit },
    ...branches
      .filter((x) => x !== mainBranchName)
      .map((branch) => ({ branch })),
  ];
  for (const ref of refs) {
    // const isMainBranch = 'branch' in ref && ref.branch === mainBranchName;

    // eslint-disable-next-line no-await-in-loop
    const branchCommits = await git.log({
      fs,
      dir,
      ref: 'branch' in ref ? ref.branch : ref.oid,
      depth: MAX_BRANCH_DEPTH,
    });

    let previousCommit = null;
    for (let i = 0; i < branchCommits.length; i++) {
      const rawCommit = branchCommits[i];
      if (rawCommit.oid in commitMap) {
        // Link to the existing commit in the map and quit this branch
        if (i === 0 && 'branch' in ref) {
          const branch = await getBranch({
            dir,
            remote,
            branchName: ref.branch,
          });
          commitMap[rawCommit.oid].metadata.branches.push(branch);
        }
        if (previousCommit) {
          commitMap[rawCommit.oid].branchSplits.push(previousCommit);
        }
        break;
      }

      const branchName = i === 0 && 'branch' in ref ? ref.branch : null;

      const branch = branchName
        ? await getBranch({ branchName, dir, remote })
        : null;

      const branchesForCommit = await getBranchesForCommit({
        oid: rawCommit.oid,
        dir,
      });
      const isMainBranch = branchesForCommit.includes(mainBranchName);

      // Add new commit
      const commit: TreeCommit = {
        type: 'commit',
        metadata: rawCommitToMeta({
          rawCommit,
          branches: [
            ...('forceBranchName' in ref && ref.forceBranchName
              ? [
                  {
                    branchName: ref.forceBranchName,
                    hasChangesFromRemote: null,
                  },
                ]
              : []),
            ...(branch ? [branch] : []),
          ],
          activeCommit,
          mainBranch: isMainBranch,
        }),
        branchSplits: previousCommit ? [previousCommit] : [],
      };

      if (rawCommit.oid === activeCommit) {
        // eslint-disable-next-line no-await-in-loop
        const unmergedFiles = await getModifiedFiles(dir);

        if (unmergedFiles.length > 0) {
          // Dirty
          dirty = true;
        }

        // eslint-disable-next-line no-await-in-loop
        const rebaseFolderExists = await rebaseInProgress(dir);

        if (rebaseFolderExists) {
          dirty = true;
        }

        if (rebaseFolderExists) {
          const unmergedFilenames = unmergedFiles
            // These are files which changed as part of the rebase but didn't have conflicts
            // They should be excluded from the view
            .filter((x) => x.status.includes('unstaged'))
            .map((x) => x.filename);
          const readFilePromise = util.promisify(fs.readFile);
          const conflictedFiles = [];
          for (const file of unmergedFilenames) {
            const contents = await readFilePromise(`${dir}/${file}`, 'utf-8');
            const lines = contents.split(/\r?\n/);
            if (lines.some((line) => line.startsWith('<<<<<<<'))) {
              conflictedFiles.push(file);
            }
          }

          commit.branchSplits.push({
            type: 'rebase',
            dirtyFiles: unmergedFilenames,
            conflictedFiles,
          });
        } else if (unmergedFiles.length > 0) {
          commit.branchSplits.push({
            type: 'modified',
            dirtyFiles: unmergedFiles.filter((x) => !!x.status) as {
              filename: string;
              status: string;
              change: ChangeType;
            }[],
            branches: commit.metadata.branches,
            rootCommit: commit,
          });
        }
      }

      commitMap[rawCommit.oid] = commit;
      previousCommit = commit;
      if (isMainBranch) {
        // Add to main branch list and quit this branch
        mainBranchCommits.push(commit);
        break;
      }
    }
  }
  const stashEntries = (await stashList({ dir })).length;

  // Assemble the main branch in order
  mainBranchCommits.sort(
    (a, b) => a.metadata.authorTs.getTime() - b.metadata.authorTs.getTime(),
  );
  for (let i = 0; i < mainBranchCommits.length - 1; ++i) {
    const commit = mainBranchCommits[i];
    const nextCommit = mainBranchCommits[i + 1];
    commit.branchSplits = [nextCommit, ...commit.branchSplits];
  }

  return {
    rootCommit: mainBranchCommits[0],
    commitMap,
    dirty,
    stashEntries,
    currentBranchName: currentBranch ?? null,
    mainBranchName,
    rebaseStatus: rebaseStatus(),
    cwd: dir,
    remote,
  };
};

export const reloadGitTree = async ({
  mainWindow,
}: {
  mainWindow: BrowserWindow | undefined;
}) => {
  try {
    const result = await extractGitTree();
    latestTree = result;
    mainWindow?.webContents.send('git-tree-updated', result);
  } catch (e) {
    // This happens in rare instances (usually race condition with filesystem)
    // Just ignore it and let the tree reload automatically
    console.error('Error reloading tree', e);
    mainWindow?.webContents.send('git-tree-updated', null);
  }
};

const REFRESH_FREQUENCY = 1000;

export const autoReloadGitTree = async ({
  mainWindow,
}: {
  mainWindow: BrowserWindow | undefined;
}) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  try {
    await reloadGitTree({ mainWindow });
  } catch (e) {
    console.error(e);
  }

  setTimeout(() => autoReloadGitTree({ mainWindow }), REFRESH_FREQUENCY);
};
