import { ReactNode, useEffect, useState } from 'react';
import { useAsync } from 'react-async';
import { head, set } from 'lodash';
import { Point, TreeCommit, TreeData, TreeEntry } from '../types/types';
import { Commit } from './Commit';
import { Rebase } from './Rebase';
import { getModified } from './Modified';
import { LINE_THICKNESS } from './consts';

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

// const COMMIT_HEIGHT = 40;
// const BRANCH_EXTRA_Y_OFFSET = 15;
const BRANCH_X_OFFSET = 30;
const BRANCH_OFF_HEIGHT = 40;

const BranchOff = ({ stroke }: { stroke: string }) => {
  const to: Point = { x: BRANCH_X_OFFSET + LINE_THICKNESS / 2, y: 0 };
  return (
    <svg
      width={BRANCH_X_OFFSET + LINE_THICKNESS}
      height={BRANCH_OFF_HEIGHT}
      xmlns="http://www.w3.org/2000/svg"
      // style={{
      //   marginLeft: -CIRCLE_RADIUS - (LINE_THICKNESS / 2),
      //   marginTop: 5,
      // }}
      style={{
        position: 'absolute',
        bottom: -40,
        left: 0,
      }}
    >
      <path
        d={`M${to.x} ${to.y} C ${to.x} ${to.y + BRANCH_OFF_HEIGHT}, ${
          to.x - BRANCH_X_OFFSET
        } ${to.y}, ${to.x - BRANCH_X_OFFSET - LINE_THICKNESS * 2} ${to.y + 50}`}
        strokeWidth={`${LINE_THICKNESS}px`}
        fill="transparent"
        stroke={stroke}
      />
    </svg>
  );
};

// const createTreeChunk = ({
//   root,
//   treeData,
//   chunkLoc,
//   rebase,
//   setRebase,
//   isRebase,
// }: {
//   root: TreeEntry;
//   treeData: TreeData;
//   chunkLoc: Point;
//   rebase: string | undefined;
//   setRebase: (oid: string | undefined) => void;
//   isRebase: boolean;
// }): TreeChunkData => {
//   const components: ReactNode[] = [];
//   const lines: ReactNode[] = [];
//   let yOffset = 0;
//   let lastLoc: Point | null = null;

//   let entry: TreeEntry | null = root;
//   let isRebaseTemp = isRebase;
//   while (entry) {
//     // TODO: Base hiding unimportant commits on this
//     // if (
//     //     commit.metadata.mainBranch &&
//     //     !commit.metadata.active &&
//     //     commit.branchSplits.length === 1
//     // ) {
//     //     commit = head(commit.branchSplits) ?? null;
//     //     continue;
//     // }
//     const loc: Point = { x: chunkLoc.x, y: chunkLoc.y + yOffset };
//     isRebaseTemp =
//       isRebaseTemp ||
//       (entry.type === 'commit' && entry.metadata.oid === rebase);
//     if (lastLoc) {
//       lines.push(
//         <Line
//           locA={loc}
//           locB={lastLoc}
//           stroke={isRebaseTemp ? 'red' : 'grey'}
//         />,
//       );
//     }
//     if (entry.type === 'rebase') {
//       components.push(
//         <Rebase loc={loc} treeData={treeData} treeRebase={entry} />,
//       );

//       entry = null;
//       yOffset -= 200; // TODO: Correct amount
//     } else if (entry.type === 'modified') {
//       const { height, component } = getModified({ loc, treeData, entry });
//       components.push(component);

//       entry = null;
//       yOffset -= height; // TODO: Correct amount
//     } else if (entry.type === 'commit') {
//       components.push(
//         <Commit
//           commit={entry}
//           treeData={treeData}
//           loc={loc}
//           isRebase={isRebaseTemp}
//           rebase={rebase}
//           setRebase={setRebase} // TODO: Disable?
//         />,
//       );

//       // Consistent branch sorting order, with main on left side and older branches
//       // further left
//       // TODO: Update sorting to prefer being based on when the oid was first
//       // seen by Derevo (so rebases always end up further right)
//       entry.branchSplits.sort((a, b) => {
//         if (a.type !== 'commit' || b.type !== 'commit') {
//           return a.type < b.type ? -1 : 1;
//         }
//         if (a.metadata.mainBranch) {
//           return -1;
//         }
//         if (b.metadata.mainBranch) {
//           return 1;
//         }
//         return a.metadata.authorTs.getTime() - b.metadata.authorTs.getTime();
//       });

//       const branchSplits: TreeEntry[] = [...entry.branchSplits];
//       let mainDescendent: TreeEntry | undefined;
//       // This if statement handles making sure that any branches off of the
//       // tip of main appear as branches, not continuations of main
//       const tipBranchSplits = head(entry.branchSplits);
//       if (
//         branchSplits.length > 0 &&
//         (!entry.metadata.mainBranch ||
//           (entry.metadata.mainBranch &&
//             tipBranchSplits?.type === 'commit' &&
//             tipBranchSplits?.metadata.mainBranch))
//       ) {
//         mainDescendent = branchSplits.shift();
//       }
//       branchSplits.reverse();

//       for (let i = 0; i < branchSplits.length; i++) {
//         const split = branchSplits[i];
//         const branchSplitToLoc = {
//           x: chunkLoc.x + BRANCH_X_OFFSET,
//           y: chunkLoc.y + yOffset - COMMIT_HEIGHT - BRANCH_EXTRA_Y_OFFSET,
//         };
//         const branchIsRebase =
//           isRebaseTemp ||
//           (split.type === 'commit' && split.metadata.oid === rebase);
//         const chunk = createTreeChunk({
//           root: split,
//           treeData,
//           chunkLoc: branchSplitToLoc,
//           rebase,
//           setRebase,
//           isRebase: branchIsRebase,
//         });
//         yOffset -= BRANCH_EXTRA_Y_OFFSET;

//         lines.push(
//           <BranchOff
//             to={branchSplitToLoc}
//             stroke={branchIsRebase ? 'red' : 'grey'}
//           />,
//         );
//         lines.push(...chunk.lines);
//         components.push(...chunk.components);
//         yOffset -= chunk.height;
//       }

//       if (entry.metadata.mainBranch && !mainDescendent) {
//         // This is for the final line of main, extending through the top of the page
//         const topLocation = {
//           x: chunkLoc.x,
//           y: chunkLoc.y + yOffset - 10,
//         };

//         lines.push(<Line locA={loc} locB={topLocation} stroke="grey" />);
//       }

//       entry = mainDescendent ?? null;
//       yOffset -= COMMIT_HEIGHT;
//     }

//     lastLoc = loc;
//   }

//   return {
//     lines,
//     components,
//     height: -yOffset,
//   };
// };

type TreeChunkType = {
  entry: TreeEntry;
  mainDescendant: TreeEntry | undefined;
  branchSplits: TreeEntry[];
  isRebasing: boolean;
};

const sortBranches = (branchSplits: TreeEntry[]) => {
  // Consistent branch sorting order, with main on left side and older branches
  // further left
  // TODO: Update sorting to prefer being based on when the oid was first
  // seen by Derevo (so rebases always end up further right)
  branchSplits.sort((a, b) => {
    if (a.type !== 'commit' || b.type !== 'commit') {
      return a.type < b.type ? -1 : 1;
    }
    if (a.metadata.mainBranch) {
      return -1;
    }
    if (b.metadata.mainBranch) {
      return 1;
    }
    return a.metadata.authorTs.getTime() - b.metadata.authorTs.getTime();
  });
};

const toEntries = ({
  root,
  isRebasing: isRebasingRaw,
  rebase,
}: {
  root: TreeEntry;
  isRebasing: boolean;
  rebase: string | undefined;
}) => {
  const entries: TreeChunkType[] = [];
  let entry: TreeEntry | undefined = root;
  let isRebasing = isRebasingRaw;
  while (entry) {
    if (entry.type !== 'commit') {
      entries.push({
        entry,
        mainDescendant: undefined,
        branchSplits: [],
        isRebasing,
      });
      break;
    }

    if (rebase === entry.metadata.oid) {
      isRebasing = true;
    }

    const branchSplits: TreeEntry[] = [...entry.branchSplits];
    sortBranches(branchSplits);
    let mainDescendant: TreeEntry | undefined;
    // This if statement handles making sure that any branches off of the
    // tip of main appear as branches, not continuations of main
    const tipBranchSplits = head(entry.branchSplits);
    if (
      branchSplits.length > 0 &&
      (!entry.metadata.mainBranch ||
        (entry.metadata.mainBranch &&
          tipBranchSplits?.type === 'commit' &&
          tipBranchSplits?.metadata.mainBranch))
    ) {
      mainDescendant = branchSplits.shift();
    }
    // branchSplits.reverse();

    entries.push({
      entry,
      mainDescendant,
      branchSplits,
      isRebasing,
    });
    entry = mainDescendant;
  }

  entries.reverse();
  return entries;
};

const TreeEntryBranches = ({
  entry,
  treeData,
  rebase,
  setRebase,
  isRebasing,
}: {
  entry: TreeChunkType;
  treeData: TreeData;
  rebase: string | undefined;
  setRebase: (oid: string | undefined) => void;
  isRebasing: boolean;
}) => {
  const branchChunks: ReactNode[] = [];
  for (const branch of entry.branchSplits) {
    branchChunks.push(
      // eslint-disable-next-line no-use-before-define
      <TreeChunk
        root={branch}
        treeData={treeData}
        rebase={rebase}
        setRebase={setRebase}
        isRebasing={isRebasing}
      />,
    );
  }
  return <div style={{ marginLeft: '0px' }}>{branchChunks}</div>;
};

const TreeEntryChunkMainRow = ({
  entry,
  treeData,
  rebase,
  setRebase,
  isRebasing,
}: {
  entry: TreeChunkType;
  treeData: TreeData;
  rebase: string | undefined;
  setRebase: (oid: string | undefined) => void;
  isRebasing: boolean;
}) => {
  if (entry.entry.type === 'commit') {
    return (
      <Commit
        commit={entry.entry}
        treeData={treeData}
        isRebase={isRebasing} // TODO: Fix
        rebase={rebase}
        setRebase={setRebase} // TODO: Disable?
      />
    );
  }
  if (entry.entry.type === 'rebase') {
    return <Rebase treeRebase={entry.entry} />
  }
  return <div>TODO: Replace me</div>;
};

const TreeEntryChunk = ({
  entry,
  treeData,
  rebase,
  setRebase,
  // isRebaseTemp,
  isRebasing: isRebasingRaw,
}: {
  entry: TreeChunkType;
  treeData: TreeData;
  rebase: string | undefined;
  setRebase: (oid: string | undefined) => void;
  // isRebaseTemp: boolean;
  isRebasing: boolean;
}) => {
  // TODO: Share this logic with the other instance
  const isRebasing =
    isRebasingRaw ||
    (entry.entry.type === 'commit' && rebase === entry.entry.metadata.oid);
  const mainRow = (
    <TreeEntryChunkMainRow
      entry={entry}
      treeData={treeData}
      rebase={rebase}
      setRebase={setRebase}
      isRebasing={isRebasing}
    />
  );
  const branches = (
    <TreeEntryBranches
      entry={entry}
      treeData={treeData}
      rebase={rebase}
      setRebase={setRebase}
      isRebasing={isRebasing}
    />
  );
  const hideTip = !entry.mainDescendant;
  return (
    <div style={{ display: 'flex' }}>
      <div
        style={{
          borderLeftWidth: `${LINE_THICKNESS}px`,
          borderColor: isRebasing ? 'red' : 'grey',
          // borderColor: 'red',
          borderLeftStyle: 'solid',
          marginTop: hideTip ? 10 : 0,
          // border: `0 solid ${isRebasing ? 'red' : 'grey'}`,
          // borderLeftWidth: `${LINE_THICKNESS}px`,

          // marginLeft: `${-LINE_THICKNESS / 2}px`,
        }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {branches}
        {mainRow}
      </div>
    </div>
  );
};

/**
 * Adjusts empty space beneath branches, where the line is not extended
 */
const MARGIN_BRANCH_BOTTOM_EMPTY = 40;
/**
 * Adjusts the margin which controls how long the line tail is
 */
const MARGIN_BRANCH_BOTTOM_LINE = 0;

const MARGIN_BRANCH_TOP_EMPTY = 10;

const MARGIN_BRANCH_TOP_LINE = -10;

const TreeChunk = ({
  root,
  treeData,
  rebase,
  setRebase,
  isRebasing: isRebasingRaw,
}: {
  root: TreeEntry;
  treeData: TreeData;
  rebase: string | undefined;
  setRebase: (oid: string | undefined) => void;
  isRebasing: boolean;
}) => {
  const entryChunks: ReactNode[] = [];
  // const lines: ReactNode[] = [];
  // let yOffset = 0;
  // let lastLoc: Point | null = null;

  // let entry: TreeEntry | null = root;
  // let isRebaseTemp = isRebase;
  const isRebasing =
    isRebasingRaw || (root.type === 'commit' && rebase === root.metadata.oid);

  for (const entry of toEntries({ root, isRebasing, rebase })) {
    // if (entry.entry.type === 'commit' && entry.entry.metadata.oid === rebase) {
    //   isRebaseTemp = true;
    // }
    entryChunks.push(
      <TreeEntryChunk
        entry={entry}
        treeData={treeData}
        rebase={rebase}
        setRebase={setRebase}
        isRebasing={entry.isRebasing}
        // isRebaseTemp={isRebaseTemp}
      />,
    );
  }

  return (
    <div
      style={{
        marginBottom: `${MARGIN_BRANCH_BOTTOM_EMPTY}px`,
        marginTop: `${MARGIN_BRANCH_TOP_EMPTY}px`,
        display: 'flex',
        position: 'relative',
      }}
    >
      <div
        style={{
          // border: `0 solid ${isRebasing ? 'red' : 'grey'}`,
          // borderLeftWidth: `${LINE_THICKNESS}px`,
          // TODO: Move the margin above?
          marginLeft: `${BRANCH_X_OFFSET}px`,
        }}
      />
      <div
        style={{
          marginBottom: `${MARGIN_BRANCH_BOTTOM_LINE}px`,
          marginTop: `${MARGIN_BRANCH_TOP_LINE}px`,
        }}
      >
        {entryChunks}
      </div>
      <BranchOff stroke={isRebasing ? 'red' : 'grey'} />
    </div>
  );
};

// const HEIGHT_OFFSET = COMMIT_HEIGHT / 2;
// const WIDTH = 900; // TODO: Can we do better?

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

  useEffect(() => {
    if (rebase && treeData && !(rebase in treeData.commitMap)) {
      setRebase(undefined);
    }
  }, [rebase, treeData]);

  if (!treeData?.rootCommit) {
    return <p>No data</p>;
  }
  // const chunk = createTreeChunk({
  //   root: treeData.rootCommit,
  //   treeData,
  //   chunkLoc: { x: 20, y: 0 },
  //   rebase,
  //   setRebase,
  //   isRebase: false,
  // });

  // const chunks: ReactNode[] = [];

  // createTreeChunkNew({
  //   root: treeData.rootCommit,
  //   treeData,
  //   rebase,
  //   setRebase,
  //   isRebase: false,
  //   chunks,
  // });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      {/* <svg
        xmlns="https://www.w3.org/2000/svg"
        viewBox={`0 -${chunk.height - HEIGHT_OFFSET} ${WIDTH} ${
          chunk.height + HEIGHT_OFFSET
        }`}
        height={chunk.height + HEIGHT_OFFSET}
        width={WIDTH}
      >
        {chunk.lines}
        {chunk.components}
      </svg> */}
      {/* <div style={{ border: '0 solid white', borderLeftWidth: '2px', marginLeft: '-40px' }} /> */}
      {/* <div
        style={{
          border: '0 solid white',
          borderLeftWidth: '2px',
          marginLeft: '15px',
        }}
      /> */}
      <TreeChunk
        root={treeData.rootCommit}
        treeData={treeData}
        rebase={rebase}
        setRebase={setRebase}
        isRebasing={false}
      />
    </div>
  );
};
