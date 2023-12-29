import { Button, ButtonGroup, Checkbox, Input } from '@mui/joy';
import { customAlphabet } from 'nanoid';
import { useEffect, useState } from 'react';
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
  // TODO: Auto-populate branch field based on title, eliminating stopwords
  const [message, setMessage] = useState<string>();
  const [branch, setBranch] = useState<string>();
  const [checkedFileMap, setCheckedFileMap] = useState<Record<string, boolean>>(
    {},
  );
  useEffect(() => {
    const entries = entry.dirtyFiles.reduce(
      (prev, file) => ({
        ...prev,
        [file]: file in checkedFileMap ? checkedFileMap[file] : true,
      }),
      {} as Record<string, boolean>,
    );
    setCheckedFileMap(entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.dirtyFiles]);

  const checkedFiles = Object.keys(checkedFileMap).filter(
    (file) => checkedFileMap[file],
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
        Changes
      </div>
      {entry.dirtyFiles.map((file) => (
        <div key={file}>
          <Checkbox
            label={file}
            defaultChecked
            onChange={(evt) => {
              const target = evt.currentTarget;
              setCheckedFileMap((prev) => ({
                ...prev,
                [file]: target.checked,
              }));
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
            color="primary"
            variant="solid"
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
                { cmd: 'git', args: ['add', ...checkedFiles] },
                {
                  cmd: 'git',
                  args: [
                    'commit',
                    '--allow-empty-message',
                    '-m',
                    message ?? '',
                    ...checkedFiles,
                  ],
                },
              ]);
            }}
          >
            Commit
          </Button>
          <Button
            onClick={async () => {
              await window.electron.runCommands([
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
                { cmd: 'git', args: ['checkout', 'head'] },
                ...entry.branches.map((br) => ({
                  cmd: 'git',
                  args: ['branch', '--force', br, 'head'],
                })),
              ]);
              // TODO: git commit --no-verify any remaining modified files. Give it a branch name (e.g. derevo-temp)
              // TODO: Rebase the rest of the existing stack on top of the modified commit
              // TODO: Uncommit derevo-temp

              // TODO: If aborted during the rebase, make sure to still do the uncommit afterwards!

              // await window.electron.rebase({
              //   from: fromRoot,
              //   to: toRoot.metadata.oid,
              // });
            }}
          >
            Amend
          </Button>
          <Button
            onClick={() => {
              // TODO: Add stash message
              window.electron.runCommands([
                { cmd: 'git', args: ['add', ...checkedFiles] },
                { cmd: 'git', args: ['stash', 'push', ...checkedFiles] },
              ]);
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
