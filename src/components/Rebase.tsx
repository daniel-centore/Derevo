import { Button, ButtonGroup } from '@mui/joy';
import { TreeData, TreeRebase } from '../types/types';
import { EntryWithBox } from './EntryWithBox';

export const Rebase = ({
  treeRebase,
  treeData,
}: {
  treeRebase: TreeRebase;
  treeData: TreeData;
}) => {
  const dir = treeData.cwd;
  return (
    <EntryWithBox circleColor="yellow">
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
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {treeRebase.dirtyFiles.map((file) => {
            const emoji = treeRebase.conflictedFiles.includes(file)
              ? '🟡'
              : '✅';
            const vscodeLink = `vscode://file${dir}/${file}`;
            return (
              <div
                key={file}
                style={{
                  flexBasis: '100%',
                }}
              >
                <Button
                  startDecorator={emoji}
                  variant="plain"
                  onClick={() => {
                    window.electron.openExternal(vscodeLink);
                  }}
                >
                  {file}
                </Button>
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
                {
                  cmd: 'git',
                  args: ['commit', '--no-verify', '--allow-empty', '--no-edit'],
                },
                {
                  cmd: 'git',
                  args: ['-c', 'core.editor=true', 'rebase', '--continue'],
                },
              ]);
            }}
          >
            {/* TODO: Disable continue if the state has been lost */}
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
    </EntryWithBox>
  );
};
