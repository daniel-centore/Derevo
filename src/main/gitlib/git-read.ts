import util from 'util';
import { exec } from 'child_process';
import fs from 'fs';

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
