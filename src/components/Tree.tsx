import { ReactNode, useEffect, useState } from 'react';
import { useAsync } from 'react-async';
import { head } from 'lodash';
import { Point, TreeCommit, TreeData } from '../types/types';
import { Commit } from './Commit';

type TreeChunkData = {
  components: ReactNode[];
  lines: ReactNode[];
  height: number;
};

const Line = ({
  locA,
  locB,
  stroke,
}: {
  locA: Point;
  locB: Point;
  stroke: string;
}) => {
  return (
    <line
      x1={locA.x}
      y1={locA.y}
      x2={locB.x}
      y2={locB.y}
      stroke={stroke}
      strokeWidth={2}
    />
  );
};

const COMMIT_HEIGHT = 40;
const BRANCH_EXTRA_Y_OFFSET = 15;
const BRANCH_X_OFFSET = 30;

const BranchOff = ({ to, stroke }: { to: Point; stroke: string }) => {
  return (
    <path
      d={`M${to.x} ${to.y} C ${to.x} ${to.y + 40}, ${to.x - BRANCH_X_OFFSET} ${
        to.y
      }, ${to.x - BRANCH_X_OFFSET} ${to.y + 50}`}
      strokeWidth="2px"
      fill="transparent"
      stroke={stroke}
    />
  );
};

const createTreeChunk = ({
  root,
  chunkLoc,
  rebase,
  setRebase,
  isRebase,
}: {
  root: TreeCommit;
  chunkLoc: Point;
  rebase: string | undefined;
  setRebase: (oid: string | undefined) => void;
  isRebase: boolean;
}): TreeChunkData => {
  const components: ReactNode[] = [];
  const lines: ReactNode[] = [];
  let yOffset = 0;
  let lastLoc: Point | null = null;

  let commit: TreeCommit | null = root;
  let isRebaseTemp = isRebase;
  while (commit) {
    // TODO: Base hiding unimportant commits on this
    // if (
    //   commit.metadata.mainBranch &&
    //   !commit.metadata.active &&
    //   commit.branchSplits.length === 1
    // ) {
    //   commit = head(commit.branchSplits) ?? null;
    //   continue;
    // }
    const loc: Point = { x: chunkLoc.x, y: chunkLoc.y + yOffset };
    isRebaseTemp = isRebaseTemp || commit.metadata.oid === rebase;
    if (lastLoc) {
      lines.push(
        <Line
          locA={loc}
          locB={lastLoc}
          stroke={isRebaseTemp ? 'red' : 'grey'}
        />,
      );
    }
    components.push(
      <Commit
        meta={commit.metadata}
        loc={loc}
        isRebase={isRebaseTemp}
        rebase={rebase}
        setRebase={setRebase} // TODO: Disable?
      />,
    );

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

    for (let i = 1; i < commit.branchSplits.length; i++) {
      const split = commit.branchSplits[i];
      const branchSplitLoc = {
        x: chunkLoc.x + BRANCH_X_OFFSET,
        y: chunkLoc.y + yOffset - COMMIT_HEIGHT - BRANCH_EXTRA_Y_OFFSET,
      };
      const branchIsRebase = isRebaseTemp || split.metadata.oid === rebase;
      const chunk = createTreeChunk({
        root: split,
        chunkLoc: branchSplitLoc,
        rebase,
        setRebase,
        isRebase: branchIsRebase,
      });
      yOffset -= BRANCH_EXTRA_Y_OFFSET;

      lines.push(
        <BranchOff
          to={branchSplitLoc}
          stroke={branchIsRebase ? 'red' : 'grey'}
        />,
      );
      lines.push(...chunk.lines);
      components.push(...chunk.components);
      yOffset -= chunk.height;
    }

    commit = head(commit.branchSplits) ?? null;
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

export const Tree = () => {
  const [treeData, setTreeData] = useState<TreeData>();
  const [rebase, setRebase] = useState<string>();

  useEffect(() => {
    // console.log('Subscribed in renderer');
    const unsubscribe = window.electron.api.on('extractGitTree', (result) => {
      // TODO: Improve types?
      // console.log('RECEIVED MESSAGE', { result });
      setTreeData(result as TreeData);
      // setTreeData({test123: 45});
    });
    return () => unsubscribe();
  }, []);

  if (!treeData?.rootCommit) {
    return <p>No data</p>;
  }
  const chunk = createTreeChunk({
    root: treeData.rootCommit,
    chunkLoc: { x: 20, y: 0 },
    rebase,
    setRebase,
    isRebase: false,
  });
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
