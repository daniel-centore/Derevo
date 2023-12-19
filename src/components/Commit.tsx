import { CommitMetadata, Point } from '../types/types';

export const Commit = ({
  meta,
  loc,
  isRebase,
  rebase,
  setRebase,
}: {
  meta: CommitMetadata;
  loc: Point;
  isRebase: boolean;
  rebase: string | undefined;
  setRebase: (oid: string | undefined) => void;
}) => {
  let circleColor = 'grey';
  if (meta.active) {
    circleColor = 'cyan';
  }
  if (isRebase) {
    circleColor = 'red';
  }
  return (
    <>
      <circle
        cx={loc.x}
        cy={loc.y}
        r="8"
        fill={circleColor}
        cursor={rebase ? 'default' : 'pointer'}
        onClick={() => {
          if (rebase) {
            return;
          }
          window.electron.api.invoke('checkout', meta.oid);
        }}
      />
      {/* TODO: Max width based on something else? */}
      <foreignObject x={loc.x + 20} y={loc.y - 15} width="1000" height="50">
        <div style={{ paddingTop: '3px' }}>
          <div
            style={{
              fontSize: '14px',
              height: '20px',
              lineHeight: '20px',
              margin: '0',
              color:
                !meta.mainBranch || meta.active ? 'rgb(188 192 196)' : 'grey',
              fontWeight: meta.active ? 'bold' : 'normal',
            }}
          >
            <span style={{ backgroundColor: 'grey', color: 'black' }}>
              {meta.branches.length > 0 && `[${meta.branches.join(', ')}]`}
            </span>{' '}
            {meta.title}
            {meta.active && !meta.mainBranch && !rebase && (
              <button
                type="button"
                style={{
                  marginLeft: '15px',
                }}
              >
                Uncommit
              </button>
            )}
            {meta.active && !meta.mainBranch && !rebase && (
              <button
                type="button"
                style={{
                  marginLeft: '15px',
                }}
                onClick={() => {
                  setRebase(meta.oid);
                }}
              >
                Rebase ⮕
              </button>
            )}
            {rebase === meta.oid && (
              <button
                type="button"
                style={{
                  marginLeft: '15px',
                }}
                onClick={() => {
                  setRebase(undefined);
                }}
              >
                Cancel Rebase
              </button>
            )}
            {rebase && !isRebase && (
              <button
                type="button"
                style={{
                  marginLeft: '15px',
                }}
                onClick={() => {
                  // TODO
                  // setRebase(undefined);
                }}
              >
                ⬅ Rebase
              </button>
            )}
          </div>
        </div>
      </foreignObject>
    </>
  );
};
