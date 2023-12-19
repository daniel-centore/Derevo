export type CommitMetadata = {
  oid: string;
  title: string;
  // hash: string;
  // timestamp: Date;
  active: boolean;
  branches: string[];
  mainBranch: boolean;
  authorTs: Date;
};

export type TreeCommit = {
  branchSplits: TreeCommit[];
  metadata: CommitMetadata;
};

export type TreeData = {
  rootCommit: TreeCommit | null;
  commitMap: Record<string, TreeCommit>;
};

export type Point = {
  x: number;
  y: number;
};
