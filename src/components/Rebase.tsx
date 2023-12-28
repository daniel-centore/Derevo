import { Button, ButtonGroup } from '@mui/joy';
import { Point, TreeCommit, TreeData, TreeRebase } from '../types/types';
import { EntryWrapper } from './EntryWrapper';
import { CIRCLE_RADIUS } from './consts';
import { EntryWithBox } from './EntryWithBox';

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
    <EntryWithBox>
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
        <div
          style={{
            marginTop: '10px',
            marginBottom: '20px',
            marginLeft: '10px',
          }}
        >
          {treeRebase.dirtyFiles.map((file) => {
            const emoji = treeRebase.conflictedFiles.includes(file)
              ? '🟡'
              : '✅';
            return (
              <div>
                {emoji} {file}
              </div>
            );
          })}
        </div>
      </div>
      <ButtonGroup>
        {treeRebase.conflictedFiles.length === 0 && (
          <Button
            color="primary"
            variant="solid"
            onClick={async () => {
              await window.electron.runCommands([
                { cmd: 'git', args: ['add', '.'] },
                // This is a kludge which forces the creation of an empty commit if
                // the rebase results in no changes
                // See https://stackoverflow.com/a/45693978/998251
                { cmd: 'git', args: ['commit', '--allow-empty', '--no-edit'] },
                {
                  cmd: 'git',
                  args: ['-c', 'core.editor=true', 'rebase', '--continue'],
                },
              ]);
            }}
          >
            Continue
          </Button>
        )}
        <Button
          onClick={async () => {
            await window.electron.invoke('abort-rebase');
          }}
        >
          Abort
        </Button>
      </ButtonGroup>
      {/* TODO: Abort button */}
    </EntryWithBox>
  );
};
