import { Point, TreeCommit, TreeData } from '../types/types';
import { CIRCLE_RADIUS, LINE_THICKNESS } from './consts';

export const Commit = ({
  commit,
  treeData,
  // loc,
  isRebase,
  rebase,
  setRebase,
}: {
  commit: TreeCommit;
  treeData: TreeData;
  // loc: Point;
  isRebase: boolean;
  rebase: string | undefined;
  setRebase: (oid: string | undefined) => void;
}) => {
  const meta = commit.metadata;
  let circleColor = 'grey';
  if (meta.active && !treeData.dirty) {
    circleColor = 'cyan';
  }
  if (isRebase) {
    circleColor = 'red';
  }
  // {
  //   /* <circle
  //       cx={loc.x}
  //       cy={loc.y}
  //       r={CIRCLE_RADIUS}
  //       fill={circleColor}
  //       cursor={rebase || treeData.dirty ? 'default' : 'pointer'}
  //       onClick={async () => {
  //         if (rebase || treeData.dirty) {
  //           return;
  //         }
  //         const ref = meta.branches[0] || meta.oid;
  //         await window.electron.api.runCommands([
  //           `git -c advice.detachedHead=false checkout ${ref}`,
  //         ]);
  //       }}
  //     /> */
  // }
  // {
  //   /* TODO: Max width based on something else? */
  // }
  // {
  //   /* <foreignObject x={loc.x + 20} y={loc.y - CIRCLE_RADIUS * 2} width="1000" height="30"> */
  // }
  return (
    <div
      style={{
        // paddingTop: '1px',
        height: '40px',
        // paddingLeft: '30px',
        // marginLeft: '-20px',
        flexBasis: '100%',
        display: 'flex',
      }}
    >
      {/* <div
        style={{
          borderLeftWidth: `${LINE_THICKNESS}px`,
          borderColor: isRebase ? 'red' : 'grey',
          // borderColor: 'red',
          borderLeftStyle: 'solid',
          // border: `0 solid ${isRebase ? 'red' : 'grey'}`,
          // marginLeft: `${-LINE_THICKNESS / 2}px`,
        }}
      /> */}
      <svg
        width={CIRCLE_RADIUS * 2}
        height={CIRCLE_RADIUS * 2}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          marginLeft: -CIRCLE_RADIUS - LINE_THICKNESS / 2,
          marginTop: '10px',
        }}
      >
        {/* <path d="M12,22 L12,36" stroke-width="2px" class="stroke-neutral-750 dark:stroke-neutral-500 border-neutral-750 dark:border-neutral-500 text-neutral-750 dark:text-neutral-400 fill-transparent" fill="transparent" stroke-dasharray="0"></path><circle cx="12" cy="18" r="4" class="stroke-neutral-750 dark:stroke-neutral-500 border-neutral-750 dark:border-neutral-500 text-neutral-750 dark:text-neutral-400 fill-transparent" stroke-width="2" stroke-dasharray="0"></circle> */}
        <circle
          cx={CIRCLE_RADIUS}
          cy={CIRCLE_RADIUS}
          r={CIRCLE_RADIUS}
          fill={circleColor}
          cursor={rebase || treeData.dirty ? 'default' : 'pointer'}
          onClick={async () => {
            if (rebase || treeData.dirty) {
              return;
            }
            const ref = meta.branches[0] || meta.oid;
            await window.electron.api.runCommands([
              `git -c advice.detachedHead=false checkout ${ref}`,
            ]);
          }}
        />
      </svg>
      <div
        style={{
          fontSize: '14px',
          lineHeight: '26px', // Should be height of largest element
          margin: '0',
          color: !meta.mainBranch || meta.active ? 'rgb(188 192 196)' : 'grey',
          fontWeight: meta.active ? 'bold' : 'normal',
          paddingLeft: '20px',
          marginTop: '5px',
        }}
      >
        <span style={{ backgroundColor: 'grey', color: 'black' }}>
          {meta.branches.length > 0 && `[${meta.branches.join(', ')}]`}
          {meta.branches.length === 0 && !meta.mainBranch && '[NO BRANCH]'}
        </span>{' '}
        {meta.title}
        {!treeData.dirty && meta.active && !meta.mainBranch && !rebase && (
          <button
            type="button"
            onClick={() => {
              setRebase(meta.oid);
            }}
          >
            Rebase →
          </button>
        )}
        {!treeData.dirty && rebase === meta.oid && (
          <button
            type="button"
            onClick={() => {
              setRebase(undefined);
            }}
            style={{
              color: 'black',
              backgroundColor: '#FF5733',
              borderColor: '#FF3408',
            }}
          >
            Cancel Rebase
          </button>
        )}
        {!treeData.dirty &&
          rebase &&
          !isRebase &&
          !commit.branchSplits.some(
            (x) => x.type === 'commit' && x.metadata.oid === rebase,
          ) && (
            <button
              type="button"
              onClick={async () => {
                const fromRoot = treeData.commitMap[rebase];
                const toRoot = treeData.commitMap[meta.oid];

                await window.electron.api.rebase({
                  from: fromRoot,
                  to: toRoot.metadata.oid,
                });
              }}
            >
              ← Rebase
            </button>
          )}
        {!treeData.dirty && meta.active && !meta.mainBranch && !rebase && (
          <button type="button">Uncommit</button>
        )}
      </div>
    </div>
  );
};
