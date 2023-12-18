import { CommitMetadata, Point } from '../types/types';

export const Commit = ({ meta, loc }: { meta: CommitMetadata; loc: Point }) => {
  return (
    <>
      <circle
        cx={loc.x}
        cy={loc.y}
        r="8"
        fill={meta.active ? 'cyan' : 'grey'}
        cursor="pointer"
        onClick={() => {
          // TODO: Checkout
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
            {meta.active && !meta.mainBranch && (
              <button
                type="button"
                style={{
                  marginLeft: '15px',
                }}
              >
                Uncommit
              </button>
            )}
            {!meta.mainBranch && (
              <button
                type="button"
                style={{
                  marginLeft: '15px',
                }}
              >
                Rebase
              </button>
            )}
          </div>
        </div>
      </foreignObject>
    </>
  );
};
