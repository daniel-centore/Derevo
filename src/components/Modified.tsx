import { Button, ButtonGroup, Checkbox, Input } from '@mui/joy';
import { customAlphabet } from 'nanoid';
import { useState } from 'react';
import { Point, TreeData, TreeModified } from '../types/types';
import { EntryWrapper } from './EntryWrapper';
import { CIRCLE_RADIUS } from './consts';

// TODO: Share with the other usages
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);

// TODO: Deleted files
// TODO: Renamed files
export const Modified = ({
  entry,
  treeData,
}: {
  entry: TreeModified;
  treeData: TreeData;
}) => {
  const [message, setMessage] = useState<string>();
  const [branch, setBranch] = useState<string>();
  return (
    <EntryWrapper circleColor="cyan">
      <div
        style={{
          marginLeft: '20px',
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingTop: '15px',
          paddingBottom: '15px',
          backgroundColor: 'rgb(30 30 30)',
          borderRadius: '10px',
          borderStyle: 'solid',
          borderColor: 'rgb(100 100 100)',
          borderWidth: '2px',
          minWidth: '600px',
        }}
      >
        <div
          style={{
            fontSize: '18px',
            // lineHeight: '26px', // Should be height of largest element
            // margin: '0',
            color: 'rgb(188 192 196)',
            fontWeight: 'bold',
            marginBottom: '10px',
          }}
        >
          Changes
        </div>
        {entry.dirtyFiles.map((file) => (
          <div key={file}>
            <Checkbox label={file} defaultChecked />
          </div>
        ))}
        <Input
          style={{
            marginTop: '15px',
            marginBottom: '15px',
          }}
          variant="outlined"
          placeholder="Commit message"
          onChange={(event) => {
            setMessage(event.target.value);
          }}
        />
        <div style={{ display: 'flex' }}>
          <Input
            style={{
              // marginTop: '15px',
              // marginBottom: '15px',
              // maxWidth: '200px',
              float: 'left',
              flexGrow: 1,
            }}
            variant="outlined"
            placeholder="Branch name (optional)"
            onChange={(event) => {
              setBranch(event.target.value);
            }}
          />
          <ButtonGroup style={{ float: 'left', marginLeft: '15px' }}>
            <Button
              onClick={async () => {
                // await window.electron.runCommands([
                // 'git add .',
                // 'git -c core.editor=true rebase --continue',
                // ]);
                window.electron.runCommands([
                  // TODO: Customize branch name
                  `git checkout -b ${branch ? branch : `derevo-${nanoid()}`}`,
                  // TODO: Respect checked files
                  'git add .',
                  // TODO: Escape the message properly
                  `git commit -m "${message}"`,
                ]);
              }}
            >
              Commit
            </Button>
            <Button onClick={() => {}}>Amend</Button>
            <Button
              onClick={() => {
                // TODO: Respect checked files
                // TODO: Add stash message
                window.electron.runCommands(['git stash']);
              }}
            >
              Stash
            </Button>
          </ButtonGroup>
        </div>
        {/* TODO: Abort button */}
      </div>
    </EntryWrapper>
  );
};
