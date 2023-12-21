import fs from 'fs';
import git, { ReadCommitResult } from 'isomorphic-git';
import util from 'util';
import { CommitMetadata, TreeCommit, TreeData } from '../../types/types';

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
  mainBranch,
  authorTs: new Date(rawCommit.commit.author.timestamp * 1000),
});

export const extractGitTree = async (): Promise<TreeData> => {
  // TODO: Replace dir
  const dir = '/Users/dcentore/Dropbox/Projects/testing-repo';
  // TODO: Customize main branch name
  const mainBranch = 'main';
  const activeCommit = await git.resolveRef({
    fs,
    dir,
    ref: 'HEAD',
  });

  const mainBranchCommits = await git.log({
    fs,
    dir,
    ref: mainBranch,
  });
  const commitMap: Record<string, TreeCommit> = {};

  let previousCommit: TreeCommit | null = null;
  for (let i = 0; i < mainBranchCommits.length; i++) {
    const rawCommit = mainBranchCommits[i];
    // console.log(
    //   'Raw Commit Main',
    //   util.inspect(
    //     { rawCommit },
    //     { showHidden: false, depth: null, colors: true },
    //   ),
    // );
    const commit: TreeCommit = {
      metadata: rawCommitToMeta({
        rawCommit,
        branch: i === 0 ? mainBranch : null,
        activeCommit,
        mainBranch: true,
      }),
      branchSplits: previousCommit ? [previousCommit] : [],
    };
    commitMap[rawCommit.oid] = commit;
    previousCommit = commit;
  }
  const rootCommit = previousCommit;
  // console.log('kapusta', { rootCommit });

  const branches = await git.listBranches({ fs, dir });
  // const branches = ['spr-8c8998', 'spr-cb27e1', 'spr-c543ff'];
  for (const branch of branches) {
    if (branch === mainBranch) {
      continue;
    }
    // TODO: Refactor to do this outside of loop?
    // eslint-disable-next-line no-await-in-loop
    const branchCommits = await git.log({
      fs,
      dir,
      ref: branch,
    });

    previousCommit = null;
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
        if (i === 0) {
          commitMap[rawCommit.oid].metadata.branches.push(branch);
        }
        if (previousCommit) {
          commitMap[rawCommit.oid].branchSplits.push(previousCommit);
        }
        break;
      }

      // Add new commit
      const commit: TreeCommit = {
        metadata: rawCommitToMeta({
          rawCommit,
          branch: i === 0 ? branch : null,
          activeCommit,
          mainBranch: false,
        }),
        branchSplits: previousCommit ? [previousCommit] : [],
        // mainDescendant: previousCommit,
      };
      commitMap[rawCommit.oid] = commit;
      previousCommit = commit;
    }

    // console.log('kapusta', { rootCommit });

    // console.log('Branch Commits', { branch, commits });
  }
  // console.log(
  //   'Branch Commits',
  //   util.inspect(
  //     { rootCommit },
  //     { showHidden: false, depth: null, colors: true },
  //   ),
  // );
  return {
    rootCommit,
    commitMap,
  };
};
