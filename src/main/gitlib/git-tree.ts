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

  const commitMap: Record<string, TreeCommit> = {};

  let rootCommit: TreeCommit | null = null;
  const branches = await git.listBranches({ fs, dir });
  // const branches = ['spr-8c8998', 'spr-cb27e1', 'spr-c543ff'];
  const refs: ({ branch: string } | { oid: string })[] = [
    { branch: mainBranch },
    { oid: activeCommit },
    ...branches.map((branch) => ({ branch })),
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
        // TODO: populate metadata
        // eslint-disable-next-line no-await-in-loop
        // const files = await git.listFiles({ fs });
        // console.log({files});
        // .git/rebase-merge/done
        commit.branchSplits.push({
          type: 'rebase',
        });
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
  return {
    rootCommit,
    commitMap,
  };
};
