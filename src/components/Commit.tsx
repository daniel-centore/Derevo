import { Button, ButtonGroup, Chip, MenuItem, MenuList } from '@mui/joy';
import { ReactNode } from 'react';
import { customAlphabet } from 'nanoid';
import { TreeCommit, TreeData } from '../types/types';
import { EntryWrapper } from './EntryWrapper';
import { HasMenu } from './HasMenu';
import { TEMP_BRANCH_PREFIX } from '../types/consts';

// TODO: Share with the other usages
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);

type Props = {
  commit: TreeCommit;
  treeData: TreeData;
  isRebase: boolean;
  rebase: string | undefined;
  setRebase: (oid: string | undefined) => void;
};

const getButtons = ({
  commit,
  treeData,
  isRebase,
  rebase,
  setRebase,
}: Props) => {
  const meta = commit.metadata;

  const buttons: ReactNode[] = [];

  if (
    treeData.rebaseStatus === 'stopped' &&
    !treeData.dirty &&
    meta.active &&
    !meta.onMainBranch &&
    !rebase
  ) {
    buttons.push(
      <Button
        // variant="outlined"
        onClick={() => {
          setRebase(meta.oid);
        }}
      >
        Rebase →
      </Button>,
    );
  }

  if (
    treeData.rebaseStatus === 'stopped' &&
    !treeData.dirty &&
    rebase === meta.oid
  ) {
    buttons.push(
      <Button
        variant="solid"
        color="danger"
        onClick={() => {
          setRebase(undefined);
        }}
      >
        Cancel Rebase
      </Button>,
    );
  }

  if (
    treeData.rebaseStatus === 'stopped' &&
    !treeData.dirty &&
    rebase &&
    !isRebase &&
    !commit.branchSplits.some(
      (x) => x.type === 'commit' && x.metadata.oid === rebase,
    )
  ) {
    buttons.push(
      <Button
        onClick={async () => {
          const fromRoot = treeData.commitMap[rebase];
          const toRoot = treeData.commitMap[meta.oid];

          await window.electron.rebase({
            from: fromRoot,
            to: toRoot.metadata.oid,
          });
        }}
      >
        ← Rebase
      </Button>,
    );
  }

  if (
    treeData.rebaseStatus === 'stopped' &&
    !treeData.dirty &&
    meta.active &&
    !meta.onMainBranch &&
    !rebase
  ) {
    buttons.push(
      <Button
        onClick={async () => {
          // TODO: Delete current branch first
          // TODO: Can we pre-populate the "Changes" dialogue which pops up afterward?
          await window.electron.runCommands([
            {
              cmd: 'git',
              args: ['-c', 'advice.detachedHead=false', 'checkout', 'head'],
            },
            ...(meta.branches.length === 0
              ? []
              : [{ cmd: 'git', args: ['branch', '-D', ...meta.branches] }]),
            { cmd: 'git', args: ['reset', '--soft', 'HEAD~'] },
          ]);
        }}
      >
        Uncommit
      </Button>,
    );
  }

  if (
    treeData.rebaseStatus === 'stopped' &&
    treeData.stashEntries > 0 &&
    meta.active
  ) {
    buttons.push(
      <Button
        onClick={() => {
          window.electron.runCommands([{ cmd: 'git', args: ['stash', 'pop'] }]);
        }}
      >
        Stash pop
        {treeData && treeData.stashEntries > 0
          ? ` (${treeData?.stashEntries})`
          : ''}
      </Button>,
    );
  }

  return buttons;
};

export const Commit = (props: Props) => {
  // TODO: --no-verify checkbox
  // TODO: Clear inputs after commit successfully completes
  const { commit, treeData, isRebase, rebase, setRebase } = props;
  const meta = commit.metadata;
  let circleColor = 'grey';
  if (meta.active && !treeData.dirty) {
    circleColor = 'cyan';
  }
  if (isRebase) {
    circleColor = 'red';
  }
  if (
    commit.metadata.branches.length === 1 &&
    commit.metadata.branches.some((x) => x.startsWith(TEMP_BRANCH_PREFIX))
  ) {
    circleColor = 'yellow';
  }
  const disableCheckout = !!(rebase || treeData.dirty);
  return (
    <EntryWrapper
      circleColor={circleColor}
      disablePointer={disableCheckout}
      onClick={async () => {
        if (disableCheckout) {
          return;
        }
        await window.electron.runCommands([
          {
            cmd: 'git',
            args: ['-c', 'advice.detachedHead=false', 'checkout', meta.oid],
          },
        ]);
      }}
    >
      <div
        style={{
          fontSize: '14px',
          lineHeight: '32px', // Should be height of largest element
          margin: '0',
          color:
            !meta.onMainBranch || meta.active ? 'rgb(188 192 196)' : 'grey',
          fontWeight: meta.active ? 'bold' : 'normal',
          paddingLeft: '20px',
          marginTop: '2px',
        }}
      >
        {meta.branches.length > 0 &&
          meta.branches.map((branch) => {
            const checkedOut = treeData.currentBranch === branch;
            return (
              <HasMenu
                key={branch}
                menuItems={[
                  {
                    label: 'Rebase →',
                    disabled: meta.onMainBranch || !!rebase,
                    onClick: () => {
                      setRebase(meta.oid);
                    },
                  },
                  {
                    label: 'Delete Branch',
                    disabled: treeData.mainBranch === branch || !!rebase,
                    onClick: () => {
                      window.electron.runCommands([
                        ...(checkedOut
                          ? [{ cmd: 'git', args: ['checkout', 'head'] }]
                          : []),
                        { cmd: 'git', args: ['branch', '-D', branch] },
                      ]);
                    },
                  },
                ]}
              >
                <Chip
                  style={{ marginRight: '7px' }}
                  variant={checkedOut ? 'solid' : 'outlined'}
                  color={checkedOut ? 'primary' : 'neutral'}
                  disabled={disableCheckout}
                  onClick={() => {
                    if (disableCheckout) {
                      return;
                    }
                    window.electron.runCommands([
                      { cmd: 'git', args: ['checkout', branch] },
                    ]);
                  }}
                >
                  {branch}
                </Chip>
              </HasMenu>
            );
          })}
        {meta.branches.length === 0 && !meta.onMainBranch && (
          <HasMenu
            menuItems={[
              {
                label: 'Create branch',
                onClick: () => {
                  window.electron.runCommands([
                    {
                      cmd: 'git',
                      args: ['branch', `derevo-${nanoid()}`, meta.oid],
                    },
                  ]);
                },
              },
              {
                label: 'Rebase →',
                disabled: meta.onMainBranch,
                onClick: () => {
                  setRebase(meta.oid);
                },
              },
            ]}
          >
            <Chip
              style={{ marginRight: '7px' }}
              variant="solid"
              color="warning"
              onClick={() => {
                if (disableCheckout) {
                  return;
                }
                window.electron.runCommands([
                  {
                    cmd: 'git',
                    args: [
                      '-c',
                      'advice.detachedHead=false',
                      'checkout',
                      meta.oid,
                    ],
                  },
                ]);
              }}
            >
              No Branch
            </Chip>
          </HasMenu>
        )}
        {meta.title}
        <ButtonGroup style={{ float: 'right', marginLeft: '15px' }} size="sm">
          {getButtons(props)}
        </ButtonGroup>
      </div>
    </EntryWrapper>
  );
};
