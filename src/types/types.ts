export type Command = { cmd: string; args: string[] };

export type RebaseStatus = 'in-progress' | 'cancel-requested' | 'stopped';

export type CommitMetadata = {
  oid: string;
  title: string;
  active: boolean;
  branches: string[];
  onMainBranch: boolean;
  authorTs: Date;
  commitTs: Date;
};

export type TreeCommit = {
  type: 'commit';
  // eslint-disable-next-line no-use-before-define
  branchSplits: TreeEntry[];
  metadata: CommitMetadata;
};

export type TreeRebase = {
  type: 'rebase';
  dirtyFiles: string[];
  conflictedFiles: string[];
};

export type TreeModified = {
  type: 'modified';
  dirtyFiles: string[];
  branches: string[];
};

export type TreeEntry = TreeCommit | TreeRebase | TreeModified;

export type TreeData = {
  rootCommit: TreeCommit | null;
  commitMap: Record<string, TreeCommit>;
  dirty: boolean;
  stashEntries: number;
  currentBranch: string | null;
  mainBranch: string;
  rebaseStatus: RebaseStatus;
};

export type Point = {
  x: number;
  y: number;
};
