import { TreeCommit, TreeData } from '../types/types';
import { EntryWrapper } from './EntryWrapper';

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
  return (
    <EntryWrapper
      circleColor={circleColor}
      disablePointer={!!rebase || treeData.dirty}
      onClick={async () => {
        if (rebase || treeData.dirty) {
          return;
        }
        const ref = meta.branches[0] || meta.oid;
        await window.electron.api.runCommands([
          `git -c advice.detachedHead=false checkout ${ref}`,
        ]);
      }}
    >
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
    </EntryWrapper>
  );
};
