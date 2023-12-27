import { Button, ButtonGroup } from '@mui/joy';
import { ReactNode } from 'react';
import { TreeCommit, TreeData } from '../types/types';
import { EntryWrapper } from './EntryWrapper';

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

  if (!treeData.dirty && meta.active && !meta.mainBranch && !rebase) {
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

  if (!treeData.dirty && rebase === meta.oid) {
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
    !treeData.dirty &&
    rebase &&
    !isRebase &&
    !commit.branchSplits.some(
      (x) => x.type === 'commit' && x.metadata.oid === rebase,
    )
  ) {
    buttons.push(
      <Button
        // variant="outlined"
        onClick={async () => {
          const fromRoot = treeData.commitMap[rebase];
          const toRoot = treeData.commitMap[meta.oid];

          await window.electron.api.rebase({
            from: fromRoot,
            to: toRoot.metadata.oid,
          });
        }}
      >
        ← Rebase
      </Button>,
    );
  }

  if (!treeData.dirty && meta.active && !meta.mainBranch && !rebase) {
    buttons.push(<Button>Uncommit</Button>);
  }

  if (treeData.stashEntries > 0 && meta.active) {
    buttons.push(
      <Button
        onClick={() => {
          window.electron.api.runCommands(['git stash pop']);
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
  return (
    <EntryWrapper
      circleColor={circleColor}
      disablePointer={!!rebase || treeData.dirty}
      onClick={async () => {
        if (rebase || treeData.dirty) {
          return;
        }
        const ref = meta.branches[0] || meta.oid;
        await window.electron.api.runCommands([
          `git -c advice.detachedHead=false checkout ${ref}`,
        ]);
      }}
    >
      <div
        style={{
          fontSize: '14px',
          lineHeight: '32px', // Should be height of largest element
          margin: '0',
          color: !meta.mainBranch || meta.active ? 'rgb(188 192 196)' : 'grey',
          fontWeight: meta.active ? 'bold' : 'normal',
          paddingLeft: '20px',
          marginTop: '5px',
        }}
      >
        <span style={{ backgroundColor: 'grey', color: 'black' }}>
          {meta.branches.length > 0 && `[${meta.branches.join(', ')}]`}
          {meta.branches.length === 0 && !meta.mainBranch && '[NO BRANCH]'}
        </span>{' '}
        {meta.title}
        <ButtonGroup style={{ float: 'right', marginLeft: '15px' }} size="sm">
          {getButtons(props)}
        </ButtonGroup>
      </div>
    </EntryWrapper>
  );
};
