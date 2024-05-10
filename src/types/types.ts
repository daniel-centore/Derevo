export type Command = { cmd: string; args: string[] };

export type RebaseStatus = 'in-progress' | 'cancel-requested' | 'stopped';

export type Branch = {
  branchName: string;
  hasChangesFromRemote: null | boolean;
};

export type CommitMetadata = {
  oid: string;
  title: string;
  active: boolean;
  branches: Branch[];
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

export type ChangeType = 'new' | 'deleted' | 'modified';

export type TreeModified = {
  type: 'modified';
  dirtyFiles: {
    filename: string;
    change: ChangeType;
  }[];
  branches: Branch[];
  rootCommit: TreeCommit;
};

export type TreeEntry = TreeCommit | TreeRebase | TreeModified;

export type TreeData = {
  rootCommit: TreeCommit | null;
  commitMap: Record<string, TreeCommit>;
  dirty: boolean;
  stashEntries: number;
  currentBranchName: string | null;
  mainBranchName: string;
  rebaseStatus: RebaseStatus;
  cwd: string;
  remote: {
    remote: string;
    url: string;
  } | null;
};

export type PrStatus = 'closed' | 'open' | 'merged';

export type GithubPR = {
  branchName: string;
  prNumber: number;
  status: PrStatus;
  url: string;
};
export type GithubData = Record<
  // Branch name
  string,
  GithubPR[]
>;

export type Point = {
  x: number;
  y: number;
};
