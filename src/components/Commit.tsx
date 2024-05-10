import { Button, ButtonGroup, Chip, Grid } from '@mui/joy';
import { ComponentProps, ReactNode } from 'react';
import { customAlphabet } from 'nanoid';
import {
  Branch,
  GithubData,
  PrStatus,
  TreeCommit,
  TreeData,
} from '../types/types';
import { EntryWrapper } from './EntryWrapper';
import { HasMenu } from './HasMenu';
import { TEMP_BRANCH_PREFIX } from '../types/consts';

// TODO: Share with the other usages
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);

type Props = {
  commit: TreeCommit;
  treeData: TreeData;
  githubData: GithubData;
  isRebase: boolean;
  rebase: string | undefined;
  setRebase: (oid: string | undefined) => void;
};

const getPrColor = (
  status: PrStatus,
  prCommitBranch: Branch | undefined,
): ComponentProps<typeof Chip>['color'] => {
  if (status === 'closed' || status === 'merged') {
    return 'neutral';
  }
  if (prCommitBranch?.hasChangesFromRemote) {
    return 'warning';
  }
  if (status === 'open') {
    return 'success';
  }
  // Shouldn't happen
  return 'danger';
};

const getUnmergedButtons = ({
  commit,
  treeData,
  githubData,
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
        key="rebase-from"
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
        key="cancel-rebase"
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
        key="rebase-to"
        onClick={async () => {
          const fromRoot = treeData.commitMap[rebase];
          const toRoot = treeData.commitMap[meta.oid];

          await window.electron.rebase({
            from: fromRoot,
            to: toRoot.metadata.oid,
            skipFirstRebase: false,
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
        key="uncommit"
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
              : [
                  {
                    cmd: 'git',
                    args: [
                      'branch',
                      '-D',
                      ...meta.branches.map((x) => x.branchName),
                    ],
                  },
                ]),
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
        key="stash-pop"
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

  const remote = treeData.remote;
  const activeBranch = commit.metadata.branches.find(
    (x) => x.branchName === treeData.currentBranchName,
  );
  if (
    treeData.rebaseStatus === 'stopped' &&
    !treeData.dirty &&
    meta.active &&
    !meta.onMainBranch &&
    !rebase &&
    remote &&
    treeData.currentBranchName &&
    activeBranch?.hasChangesFromRemote !== false
  ) {
    buttons.push(
      <Button
        key="stash-pop"
        onClick={() => {
          window.electron.runCommands([
            {
              cmd: 'git',
              args: ['push', remote.remote, 'HEAD', '--force-with-lease'],
            },
          ]);
        }}
        color="success"
        variant="solid"
      >
        Push
      </Button>,
    );
  }

  return buttons;
};

export const Commit = (props: Props) => {
  // TODO: --no-verify checkbox
  // TODO: Clear inputs after commit successfully completes
  const { commit, treeData, isRebase, rebase, setRebase, githubData } = props;
  const meta = commit.metadata;
  let circleColor = 'grey';
  if (meta.active && !treeData.dirty && !treeData.currentBranchName) {
    circleColor = 'cyan';
  }
  if (isRebase) {
    circleColor = 'red';
  }
  if (
    commit.metadata.branches.length === 1 &&
    commit.metadata.branches.some((x) =>
      x.branchName.startsWith(TEMP_BRANCH_PREFIX),
    )
  ) {
    circleColor = 'yellow';
  }
  const disableCheckout = !!(rebase || treeData.dirty);
  const prs = commit.metadata.branches.flatMap(
    (branch) => githubData[branch.branchName] ?? [],
  );
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
      <Grid
        container
        // wrap="nowrap"
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
            const checkedOut = treeData.currentBranchName === branch.branchName;
            return (
              <HasMenu
                key={branch.branchName}
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
                    disabled:
                      treeData.mainBranchName === branch.branchName || !!rebase,
                    onClick: () => {
                      window.electron.runCommands([
                        ...(checkedOut
                          ? [{ cmd: 'git', args: ['checkout', 'head'] }]
                          : []),
                        {
                          cmd: 'git',
                          args: ['branch', '-D', branch.branchName],
                        },
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
                      { cmd: 'git', args: ['checkout', branch.branchName] },
                    ]);
                  }}
                >
                  {branch.branchName}
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
        <span
          style={{
            textDecoration: prs.some((pr) => pr.status === 'merged')
              ? 'line-through'
              : 'inherit',
          }}
        >
          {meta.title}
        </span>
        {prs.map((pr) => {
          const prCommitBranch = commit.metadata.branches.find(
            (x) => x.branchName === pr.branchName,
          );
          return (
            <Chip
              style={{ marginRight: '7px', marginLeft: '7px' }}
              variant="solid"
              color={getPrColor(pr.status, prCommitBranch)}
              onClick={() => {
                window.electron.openExternal(pr.url);
              }}
            >
              #{pr.prNumber}
              {pr.status === 'closed' && ' (Closed)'}
              {pr.status === 'merged' && ' (Merged)'}
              {pr.status === 'open' &&
                (prCommitBranch?.hasChangesFromRemote
                  ? ' (Out of Sync)'
                  : ' (Open)')}
            </Chip>
          );
        })}
        <ButtonGroup size="sm" style={{ marginLeft: '10px' }}>
          {getUnmergedButtons(props)}
        </ButtonGroup>
      </Grid>
    </EntryWrapper>
  );
};
