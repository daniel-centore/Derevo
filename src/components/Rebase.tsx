import { Point, TreeCommit, TreeData } from '../types/types';

export const Rebase = ({
  // commit,
  // treeData,
  loc,
  // isRebase,
  // rebase,
  // setRebase,
}: {
  // commit: TreeCommit;
  // treeData: TreeData;
  loc: Point;
  // isRebase: boolean;
  // rebase: string | undefined;
  // setRebase: (oid: string | undefined) => void;
}) => {
  // const meta = commit.metadata;
  return (
    <>
      <circle
        cx={loc.x}
        cy={loc.y}
        r="8"
        fill="green"
        // cursor={rebase ? 'default' : 'pointer'}
        // onClick={async () => {
        //   if (rebase) {
        //     return;
        //   }
        //   const ref = meta.branches[0] || meta.oid;
        //   await window.electron.api.runCommands([
        //     `git -c advice.detachedHead=false checkout ${ref}`,
        //   ]);
        // }}
      />
      {/* TODO: Max width based on something else? */}
      {/* <foreignObject x={loc.x + 20} y={loc.y - 15} width="1000" height="30">
        <div style={{ paddingTop: '1px' }}>
          <div
            style={{
              fontSize: '14px',
              lineHeight: '26px', // Should be height of largest element
              margin: '0',
              color:
                !meta.mainBranch || meta.active ? 'rgb(188 192 196)' : 'grey',
              fontWeight: meta.active ? 'bold' : 'normal',
            }}
          >
            <span style={{ backgroundColor: 'grey', color: 'black' }}>
              {meta.branches.length > 0 && `[${meta.branches.join(', ')}]`}
              {meta.branches.length === 0 && !meta.mainBranch && '[NO BRANCH]'}
            </span>{' '}
            {meta.title}
            {meta.active && !meta.mainBranch && !rebase && (
              <button type="button">Uncommit</button>
            )}
            {meta.active && !meta.mainBranch && !rebase && (
              <button
                type="button"
                onClick={() => {
                  setRebase(meta.oid);
                }}
              >
                Rebase →
              </button>
            )}
            {rebase === meta.oid && (
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
            {rebase &&
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
          </div>
        </div>
      </foreignObject> */}
    </>
  );
};