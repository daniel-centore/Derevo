import { Button } from '@mui/joy';
import { Point, TreeCommit, TreeData, TreeRebase } from '../types/types';
import { EntryWrapper } from './EntryWrapper';
import { CIRCLE_RADIUS } from './consts';

export const Rebase = ({
  // commit,
  treeRebase, // rebase,
  // loc, // isRebase,
} // treeData,
// setRebase,
: {
  // commit: TreeCommit;
  treeRebase: TreeRebase;
  // treeData: TreeData;
  // loc: Point;
  // isRebase: boolean;
  // rebase: string | undefined;
  // setRebase: (oid: string | undefined) => void;
}) => {
  return (
    <EntryWrapper circleColor="cyan">
      <div
        style={{
          marginLeft: '20px',
          paddingLeft: '5px',
          paddingRight: '5px',
          backgroundColor: 'rgb(50 50 50)',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            lineHeight: '26px', // Should be height of largest element
            margin: '0',
            color: 'rgb(188 192 196)',
            fontWeight: 'bold',
          }}
        >
          Rebase in Progress
          <br />
          Dirty: {treeRebase.dirtyFiles.join(', ')}
          <br />
          Conflicts: {treeRebase.conflictedFiles.join(', ')}
        </div>
        {treeRebase.conflictedFiles.length === 0 && (
          <Button
            variant="outlined"
            style={{ marginTop: '7px' }}
            onClick={async () => {
              await window.electron.runCommands([
                'git add .',
                'git -c core.editor=true rebase --continue',
              ]);
            }}
          >
            Continue
          </Button>
        )}
        {/* TODO: Abort button */}
      </div>
    </EntryWrapper>
  );
};
