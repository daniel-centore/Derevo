import util from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import { TreeCommit } from '../../types/types';

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

// TODO: If rebase is aborted, reassign the branch names from the new commits
// to the old ones to rebuild the original graph

// export const rebase = async ({
//   // root,
//   from,
//   to, // rebaseRoot = true,
// }: {
//   // root: TreeCommit;
//   from: TreeCommit;
//   to: TreeCommit | string;
//   // rebaseRoot: boolean;
// }) => {
//   // TODO
//   const dir = '/Users/dcentore/Dropbox/Projects/testing-repo';

//   const fromBranch = from.metadata.branches[0];
//   await executeCommand(
//     dir,
//     `git rebase --onto ${
//       typeof to === 'string' ? to : to.metadata.oid
//     } ${fromBranch}~1 ${fromBranch}`,
//   );

//   for (const bs of from.branchSplits) {
//     if (bs.type !== 'commit') {
//       continue;
//     }
//     // eslint-disable-next-line no-await-in-loop
//     await rebase({
//       from: bs,
//       to: fromBranch,
//     });
//   }
// };

export const getModifiedFiles = async (
  dir: string,
  { variant }: { variant: 'unmerged' | 'modified' },
) => {
  const execPromise = util.promisify(exec);
  // eslint-disable-next-line no-await-in-loop
  const { stdout: unmergedFilesRaw } = await execPromise(
    `git --no-pager ls-files --${variant}`,
    { cwd: dir },
  );
  const unmergedFiles = [
    ...new Set(
      unmergedFilesRaw
        .trim()
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => (variant === 'unmerged' ? line.split('\t')[1] : line))
        .map((file) => `${dir}/${file}`),
    ),
  ];
  unmergedFiles.sort();
  console.log({ unmergedFiles });
  return unmergedFiles;
};

export const rebaseInProgress = async (dir: string) => {
  const existsPromise = util.promisify(fs.exists);
  const rebaseFolderExists = (
    await Promise.all([
      existsPromise(`${dir}/.git/rebase-apply`),
      existsPromise(`${dir}/.git/rebase-merge`),
    ])
  ).some((x) => x);
  return rebaseFolderExists;
};
