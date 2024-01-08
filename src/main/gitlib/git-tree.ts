import fs from 'fs';
import git, { ReadCommitResult } from 'isomorphic-git';
import util from 'util';
import { exec } from 'child_process';
import { BrowserWindow } from 'electron';
import {
  ChangeType,
  CommitMetadata,
  TreeCommit,
  TreeData,
} from '../../types/types';
import { getModifiedFiles, rebaseInProgress } from './git-read';
import { rebaseStatus } from './activity-status';
import { getCwd } from '../app-settings';

const rawCommitToMeta = ({
  rawCommit,
  branch,
  activeCommit,
  mainBranch,
}: {
  rawCommit: ReadCommitResult;
  branch: string | null;
  activeCommit: string;
  mainBranch: boolean;
}): CommitMetadata => ({
  oid: rawCommit.oid,
  branches: branch ? [branch] : [],
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

export const extractGitTree = async (): Promise<TreeData | null> => {
  // TODO: Replace dir
  const dir = await getCwd();

  if (!dir) {
    // No directory has been selected yet
    return null;
  }

  // TODO: Customize main branch name
  const mainBranch = 'main';

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

  let rootCommit: TreeCommit | null = null;
  const branches = await git.listBranches({ fs, dir });
  // const branches = ['spr-8c8998', 'spr-cb27e1', 'spr-c543ff'];
  const refs: ({ branch: string } | { oid: string })[] = [
    { branch: mainBranch },
    { oid: activeCommit },
    ...branches.filter((x) => x !== mainBranch).map((branch) => ({ branch })),
  ];
  for (const ref of refs) {
    const isMainBranch = 'branch' in ref && ref.branch === mainBranch;

    // if ('branch' in ref && ref.branch === mainBranch) {
    //   continue;
    // }
    // TODO: Refactor to do this outside of loop?
    // eslint-disable-next-line no-await-in-loop
    const branchCommits = await git.log({
      fs,
      dir,
      ref: 'branch' in ref ? ref.branch : ref.oid,
    });

    let previousCommit = null;
    for (let i = 0; i < branchCommits.length; i++) {
      const rawCommit = branchCommits[i];
      // console.log(
      //   'Raw Commit',
      //   util.inspect(
      //     { rawCommit },
      //     { showHidden: false, depth: null, colors: true },
      //   ),
      // );
      // console.log({ rawCommit });
      if (rawCommit.oid in commitMap) {
        // Link to the existing commit in the map and quit this branch
        if (i === 0 && 'branch' in ref) {
          commitMap[rawCommit.oid].metadata.branches.push(ref.branch);
        }
        if (previousCommit) {
          commitMap[rawCommit.oid].branchSplits.push(previousCommit);
        }
        break;
      }

      // Add new commit
      const commit: TreeCommit = {
        type: 'commit',
        metadata: rawCommitToMeta({
          rawCommit,
          branch: i === 0 && 'branch' in ref ? ref.branch : null,
          activeCommit,
          mainBranch: isMainBranch,
        }),
        branchSplits: previousCommit ? [previousCommit] : [],
      };

      if (rawCommit.oid === activeCommit) {
        // const execPromise = util.promisify(exec);
        // eslint-disable-next-line no-await-in-loop
        const unmergedFiles = await getModifiedFiles(dir);
        console.log({ unmergedFiles });

        // console.log({ unmergedFiles });

        if (unmergedFiles.length > 0) {
          // Dirty
          dirty = true;
        }

        const rebaseFolderExists = await rebaseInProgress(dir);
        // const conflictedFile = (
        //   // eslint-disable-next-line no-await-in-loop
        //   await Promise.all(
        //     unmergedFiles.map((file) => readFilePromise(file, 'utf-8')),
        //   )
        // ).map((text) => text.split('\n'));

        // TODO: Check for active merge
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
          // const unmergedFilenames = unmergedFiles.map((x) => x.filename);
          commit.branchSplits.push({
            type: 'modified',
            dirtyFiles: unmergedFiles.filter((x) => !!x.status) as {
              filename: string;
              status: string;
              change: ChangeType;
            }[],
            branches: commit.metadata.branches,
          });
        }

        // eslint-disable-next-line no-await-in-loop
        // const files = await git.listFiles({ fs });
        // console.log({files});
        //
      }

      commitMap[rawCommit.oid] = commit;
      previousCommit = commit;
      if (isMainBranch && i === branchCommits.length - 1) {
        rootCommit = commit;
      }
    }
  }
  // console.log(
  //   'Branch Commits',
  //   util.inspect(
  //     { rootCommit },
  //     { showHidden: false, depth: null, colors: true },
  //   ),
  // );
  const stashEntries = (await stashList({ dir })).length;
  return {
    rootCommit,
    commitMap,
    dirty,
    stashEntries,
    currentBranch: currentBranch ?? null,
    mainBranch,
    rebaseStatus: rebaseStatus(),
    cwd: dir,
  };
};

export const reloadGitTree = async ({
  mainWindow,
}: {
  mainWindow: BrowserWindow | undefined;
}) => {
  try {
    const result = await extractGitTree();
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
