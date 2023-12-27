import { Button } from '@mui/joy';
import { Point, TreeData, TreeModified } from '../types/types';
import { EntryWrapper } from './EntryWrapper';
import { CIRCLE_RADIUS } from './consts';

export const Modified = ({
  entry,
  treeData,
}: {
  entry: TreeModified;
  treeData: TreeData;
}) => {
  return (
    <EntryWrapper circleColor="cyan">
      <div
        style={{
          marginLeft: '20px',
          padding: '10px',
          backgroundColor: 'rgb(50 50 50)',
          borderRadius: '10px',
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
          Changes
        </div>
        <ul>
          {entry.dirtyFiles.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
        <Button
          variant="soft"
          color="primary"
          style={{ marginTop: '7px' }}
          onClick={async () => {
            // await window.electron.api.runCommands([
            // 'git add .',
            // 'git -c core.editor=true rebase --continue',
            // ]);
          }}
        >
          Commit
        </Button>
        {/* TODO: Abort button */}
      </div>
    </EntryWrapper>
  );
};
