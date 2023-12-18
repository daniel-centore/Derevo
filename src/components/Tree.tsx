import { ReactNode, useEffect } from 'react';
import { useAsync } from 'react-async';
import { head } from 'lodash';
import { Point, TreeCommit, TreeData } from '../types/types';
import { Commit } from './Commit';

type TreeChunkData = {
  components: ReactNode[];
  lines: ReactNode[];
  height: number;
};

const Line = ({ locA, locB }: { locA: Point; locB: Point }) => {
  return (
    <line
      x1={locA.x}
      y1={locA.y}
      x2={locB.x}
      y2={locB.y}
      stroke="grey"
      strokeWidth={2}
    />
  );
};

const COMMIT_HEIGHT = 40;
const BRANCH_EXTRA_Y_OFFSET = 15;
const BRANCH_X_OFFSET = 30;

const BranchOff = ({ to }: { to: Point }) => {
  return (
    <path
      d={`M${to.x} ${to.y} C ${to.x} ${to.y + 40}, ${to.x - BRANCH_X_OFFSET} ${
        to.y
      }, ${to.x - BRANCH_X_OFFSET} ${to.y + 50}`}
      strokeWidth="2px"
      fill="transparent"
      stroke="grey"
    />
  );
};

const createTreeChunk = ({
  root,
  chunkLoc,
}: {
  root: TreeCommit;
  chunkLoc: Point;
}): TreeChunkData => {
  const components: ReactNode[] = [];
  const lines: ReactNode[] = [];
  let yOffset = 0;
  let lastLoc: Point | null = null;

  let commit: TreeCommit | null = root;
  while (commit) {
    const loc: Point = { x: chunkLoc.x, y: chunkLoc.y + yOffset };
    if (lastLoc) {
      lines.push(<Line locA={loc} locB={lastLoc} />);
    }
    components.push(<Commit meta={commit.metadata} loc={loc} />);

    if (commit.metadata.title.includes('01100c1')) {
      console.log('kapusta A', {
        splits: commit.branchSplits.map((x) => x.metadata.authorTs),
      });
    }

    // Consistent branch sorting order, with main on left side and older branches
    // further left
    commit.branchSplits.sort((a, b) => {
      if (a.metadata.mainBranch) {
        return -1;
      }
      if (b.metadata.mainBranch) {
        return 1;
      }
      return a.metadata.authorTs.getTime() - b.metadata.authorTs.getTime();
    });

    if (commit.metadata.title.includes('01100c1')) {
      console.log('kapusta B', {
        splits: commit.branchSplits.map((x) => x.metadata.authorTs),
      });
    }

    for (let i = 1; i < commit.branchSplits.length; i++) {
      const split = commit.branchSplits[i];
      const branchSplitLoc = {
        x: chunkLoc.x + BRANCH_X_OFFSET,
        y: chunkLoc.y + yOffset - COMMIT_HEIGHT - BRANCH_EXTRA_Y_OFFSET,
      };
      const chunk = createTreeChunk({
        root: split,
        chunkLoc: branchSplitLoc,
      });
      yOffset -= BRANCH_EXTRA_Y_OFFSET;

      lines.push(<BranchOff to={branchSplitLoc} />);
      lines.push(...chunk.lines);
      components.push(...chunk.components);
      yOffset -= chunk.height;
    }

    const mainDescendant: TreeCommit | null = head(commit.branchSplits) ?? null;
    commit = mainDescendant;
    yOffset -= COMMIT_HEIGHT;
    lastLoc = loc;
  }

  return {
    lines,
    components,
    height: -yOffset,
  };
};

const HEIGHT_OFFSET = COMMIT_HEIGHT / 2;
const WIDTH = 1000; // TODO: Compute max width instead

export const Tree = ({ treeData }: { treeData: TreeData }) => {
  if (!treeData.rootCommit) {
    return <p>No data</p>;
  }
  const chunk = createTreeChunk({
    root: treeData.rootCommit,
    chunkLoc: { x: 20, y: 0 },
  });
  // const tree = useAsync(async () => {
  //   // await extractTree();
  // });
  return (
    <div>
      <svg
        xmlns="https://www.w3.org/2000/svg"
        viewBox={`0 -${chunk.height - HEIGHT_OFFSET} ${WIDTH} ${
          chunk.height + HEIGHT_OFFSET
        }`}
        height={chunk.height + HEIGHT_OFFSET}
        width={WIDTH}
      >
        {chunk.lines}
        {chunk.components}
      </svg>
    </div>
  );
};
