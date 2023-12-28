import { Button, ButtonGroup, Chip, MenuItem, MenuList } from '@mui/joy';
import { ReactNode } from 'react';
import { customAlphabet } from 'nanoid';
import { TreeCommit, TreeData } from '../types/types';
import { EntryWrapper } from './EntryWrapper';
import { HasMenu } from './HasMenu';

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
            'git checkout head',
            `git branch -D ${meta.branches.join(' ')}`,
            'git reset --soft HEAD~',
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
          window.electron.runCommands(['git stash pop']);
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
  const { commit, treeData, isRebase, rebase, setRebase } = props;
  const meta = commit.metadata;
  let circleColor = 'grey';
  if (meta.active && !treeData.dirty) {
    circleColor = 'cyan';
  }
  if (isRebase) {
    circleColor = 'red';
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
          `git -c advice.detachedHead=false checkout ${meta.oid}`,
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
                    label: 'Rebase',
                    disabled: meta.onMainBranch,
                    onClick: () => {
                      setRebase(meta.oid);
                    },
                  },
                  {
                    label: 'Delete Branch',
                    disabled: checkedOut || treeData.mainBranch === branch,
                    onClick: () => {
                      window.electron.runCommands([`git branch -D ${branch}`]);
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
                      `git -c advice.detachedHead=false checkout ${branch}`,
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
                    // `git -c advice.detachedHead=false checkout ${meta.oid}`,
                    `git branch derevo-${nanoid()} ${meta.oid}`,
                  ]);
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
                  `git -c advice.detachedHead=false checkout ${meta.oid}`,
                ]);
              }}
            >
              No Branch
            </Chip>
          </HasMenu>
        )}
        {/* <span style={{ backgroundColor: 'grey', color: 'black' }}>
          {meta.branches.length > 0 && `[${meta.branches.join(', ')}]`}
          {meta.branches.length === 0 && !meta.mainBranch && '[NO BRANCH]'}
        </span>{' '} */}
        {meta.title}
        <ButtonGroup style={{ float: 'right', marginLeft: '15px' }} size="sm">
          {getButtons(props)}
        </ButtonGroup>
      </div>
    </EntryWrapper>
  );
};
