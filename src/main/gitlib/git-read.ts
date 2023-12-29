import util from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import git from 'isomorphic-git';
import { ChangeType } from '../../types/types';

export const getModifiedFiles = async (
  dir: string,
  // { variant }: { variant: 'unmerged' | 'modified' },
) => {
  const FILE = 0;
  const HEAD = 1;
  const WORKDIR = 2;
  const STAGE = 3;

  // TODO: Better types
  const statusMapping: Record<string, string> = {
    '003': 'added, staged, deleted unstaged',
    '020': 'new, untracked',
    '022': 'added, staged',
    '023': 'added, staged, with unstaged changes',
    '100': 'deleted, staged',
    '101': 'deleted, unstaged',
    '103': 'modified, staged, deleted unstaged',
    '111': 'unmodified',
    '121': 'modified, unstaged',
    '122': 'modified, staged',
    '123': 'modified, staged, with unstaged changes',
  };

  const statusToModifiedMapping: Record<string, ChangeType | null> = {
    '003': null,
    '020': 'new',
    '022': 'new',
    '023': 'new',
    '100': 'deleted',
    '101': 'deleted',
    '103': 'modified',
    '111': null,
    '121': 'modified',
    '122': 'modified',
    '123': 'modified',
  };

  const statusMatrix = (await git.statusMatrix({ fs, dir })).filter(
    (row) => row[HEAD] !== row[WORKDIR] || row[HEAD] !== row[STAGE],
  );

  const allUncommitedChanges = statusMatrix.map(
    // (row) => `${statusMapping[row.slice(1).join('')]}: ${row[FILE]}`,
    (row) => ({
      filename: row[FILE],
      // TODO: Use something better than the status
      status: statusMapping[row.slice(1).join('')],
      change: statusToModifiedMapping[row.slice(1).join('')],
    }),
  );

  return allUncommitedChanges;

  // const execPromise = util.promisify(exec);
  // // eslint-disable-next-line no-await-in-loop
  // const variant = 'modified' as 'unmerged' | 'modified';
  // const { stdout: unmergedFilesRaw } = await execPromise(
  //   `git --no-pager ls-files --${variant}`,
  //   { cwd: dir },
  // );
  // const unmergedFiles = [
  //   ...new Set(
  //     unmergedFilesRaw
  //       .trim()
  //       .split('\n')
  //       .filter((line) => line.trim().length > 0)
  //       .map((line) => (variant === 'unmerged' ? line.split('\t')[1] : line))
  //       .map((file) => `${dir}/${file}`),
  //   ),
  // ];
  // unmergedFiles.sort();
  // // console.log({ unmergedFiles });
  // return unmergedFiles;
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
