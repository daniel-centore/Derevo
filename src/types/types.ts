export type CommitMetadata = {
  oid: string;
  title: string;
  active: boolean;
  branches: string[];
  mainBranch: boolean;
  authorTs: Date;
};

export type TreeCommit = {
  type: 'commit';
  // eslint-disable-next-line no-use-before-define
  branchSplits: TreeEntry[];
  metadata: CommitMetadata;
};

export type TreeRebase = {
  type: 'rebase';
}

export type TreeEntry = TreeCommit | TreeRebase;

export type TreeData = {
  rootCommit: TreeCommit | null;
  commitMap: Record<string, TreeCommit>;
};

export type Point = {
  x: number;
  y: number;
};
