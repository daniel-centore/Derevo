import { Point, TreeData, TreeModified } from '../types/types';
import { CIRCLE_RADIUS } from './consts';

type Params = {
  entry: TreeModified;
  treeData: TreeData;
  loc: Point;
};

const Modified = ({ params, height }: { params: Params; height: number }) => {
  const { entry, treeData, loc } = params;
  return (
    <>
      <circle cx={loc.x} cy={loc.y} r={CIRCLE_RADIUS} fill="cyan" />
      {/* TODO: Max width based on something else? */}
      <foreignObject
        x={loc.x + 20}
        y={loc.y - height + CIRCLE_RADIUS}
        width="1000"
        height={height}
      >
        <div
          style={{
            height: `${height-20}px`,
            width: '700px',
            backgroundColor: 'rgb(40 40 40)',
            padding: '10px',
            borderRadius: '15px',
          }}
        >
          <h2>Changes</h2>
        </div>
        {/* <div style={{ paddingTop: '1px', backgroundColor: 'rgb(50 50 50)' }}>
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
          </button> */}
        {/* </div> */}
      </foreignObject>
    </>
  );
};

const EXTRA_OFFSET_Y = 30;

export const getModified = (params: Params) => {
  const height = 300;
  return {
    height: height + EXTRA_OFFSET_Y,
    component: <Modified params={params} height={height} />,
  };
};
