import { Button, ButtonGroup, Checkbox, Input } from '@mui/joy';
import { customAlphabet } from 'nanoid';
import { useState } from 'react';
import { isNil } from 'lodash';
import { TreeData, TreeModified } from '../types/types';
import { EntryWithBox } from './EntryWithBox';

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
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(
    new Set(entry.dirtyFiles),
  );
  return (
    <EntryWithBox>
      <div
        style={{
          fontSize: '18px',
          color: 'rgb(188 192 196)',
          fontWeight: 'bold',
          marginBottom: '10px',
        }}
      >
        Changes {entry.branches}
      </div>
      {entry.dirtyFiles.map((file) => (
        <div key={file}>
          <Checkbox
            label={file}
            defaultChecked
            onChange={(evt) => {
              if (evt.currentTarget.checked) {
                setCheckedFiles((prev) => new Set([...prev, file]));
              } else {
                setCheckedFiles(
                  (prev) => new Set([...prev].filter((x) => x !== file)),
                );
              }
            }}
          />
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
              window.electron.runCommands([
                {
                  cmd: 'git',
                  args: [
                    'checkout',
                    '-b',
                    branch ? branch : `derevo-${nanoid()}`,
                  ],
                },
                // TODO: Respect checked files
                { cmd: 'git', args: ['add', ...checkedFiles] },
                {
                  cmd: 'git',
                  args: [
                    'commit',
                    '--allow-empty-message',
                    '-m',
                    message ?? '',
                  ],
                },
              ]);
            }}
          >
            Commit
          </Button>
          <Button
            onClick={() => {
              window.electron.runCommands([
                { cmd: 'git', args: ['add', ...checkedFiles] },
                {
                  cmd: 'git',
                  args: [
                    'commit',
                    '--allow-empty-message',
                    ...(!isNil(message) && message.length > 0
                      ? ['-m', message]
                      : ['--no-edit']),
                    '--amend',
                    ...checkedFiles,
                  ],
                },
              ]);
            }}
          >
            Amend
          </Button>
          <Button
            onClick={() => {
              // TODO: Respect checked files
              // TODO: Add stash message
              window.electron.runCommands([{ cmd: 'git', args: ['stash'] }]);
            }}
          >
            Stash
          </Button>
        </ButtonGroup>
      </div>
      {/* TODO: Abort button */}
    </EntryWithBox>
  );
};
