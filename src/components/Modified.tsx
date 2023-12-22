import { Point, TreeData, TreeModified } from '../types/types';

export const Modified = ({
  entry,
  treeData,
  loc,
}
: {
  entry: TreeModified;
  treeData: TreeData;
  loc: Point;
}) => {
  return (
    <>
      <circle cx={loc.x} cy={loc.y} r="8" fill="cyan" />
      {/* TODO: Max width based on something else? */}
      <foreignObject x={loc.x + 20} y={loc.y - 170} width="1000" height="200">
        <div style={{ paddingTop: '1px', backgroundColor: 'rgb(50 50 50)' }}>
          <div
            style={{
              fontSize: '14px',
              lineHeight: '26px', // Should be height of largest element
              margin: '0',
              color: 'rgb(188 192 196)',
              fontWeight: 'bold',
            }}
          >
            Modifications Ready
            <br />
            Dirty: {entry.dirtyFiles.join(', ')}
          </div>
          <button
            type="button"
            style={{ marginTop: '7px' }}
            onClick={async () => {
              // await window.electron.api.runCommands([
              //   'git add .',
              //   'git -c core.editor=true rebase --continue',
              // ]);
            }}
          >
            Commit
          </button>
        </div>
      </foreignObject>
    </>
  );
};
