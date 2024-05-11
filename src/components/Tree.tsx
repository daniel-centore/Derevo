import { ReactNode, useEffect, useState } from 'react';
import { head } from 'lodash';
import { GithubData, Point, TreeData, TreeEntry } from '../types/types';
import { Commit } from './Commit';
import { Rebase } from './Rebase';
import { Modified } from './Modified';
import { LINE_THICKNESS } from './consts';

const BRANCH_X_OFFSET = 30;
const BRANCH_OFF_HEIGHT = 40;

const BranchOff = ({ stroke }: { stroke: string }) => {
    const to: Point = { x: BRANCH_X_OFFSET + LINE_THICKNESS / 2, y: 0 };
    return (
        <svg
            width={BRANCH_X_OFFSET + LINE_THICKNESS}
            height={BRANCH_OFF_HEIGHT}
            xmlns="http://www.w3.org/2000/svg"
            style={{
                position: 'absolute',
                bottom: -40,
                left: 0,
            }}
        >
            <path
                d={`M${to.x} ${to.y} C ${to.x} ${to.y + BRANCH_OFF_HEIGHT}, ${
                    to.x - BRANCH_X_OFFSET
                } ${to.y}, ${to.x - BRANCH_X_OFFSET - LINE_THICKNESS * 2} ${
                    to.y + 50
                }`}
                strokeWidth={`${LINE_THICKNESS}px`}
                fill="transparent"
                stroke={stroke}
            />
        </svg>
    );
};

type TreeChunkType = {
    entry: TreeEntry;
    mainDescendant: TreeEntry | undefined;
    branchSplits: TreeEntry[];
    isRebasing: boolean;
};

const sortBranches = (branchSplits: TreeEntry[]) => {
    // Consistent branch sorting order, with main on left side and older branches
    // further left
    // TODO: Update sorting to prefer being based on when the oid was first
    // seen by Derevo (so rebases always end up further right)
    branchSplits.sort((a, b) => {
        if (a.type !== 'commit') {
            return 1;
        }
        if (b.type !== 'commit') {
            return -1;
        }
        if (a.metadata.onMainBranch) {
            return -1;
        }
        if (b.metadata.onMainBranch) {
            return 1;
        }
        const authorDiff =
            a.metadata.authorTs.getTime() - b.metadata.authorTs.getTime();
        if (authorDiff !== 0) {
            return authorDiff;
        }
        const commitDiff =
            a.metadata.authorTs.getTime() - b.metadata.authorTs.getTime();
        if (commitDiff !== 0) {
            return commitDiff;
        }
        // Tiebreaker
        return a.metadata.oid.localeCompare(b.metadata.oid);
    });
};

const toEntries = ({
    root,
    isRebasing: isRebasingRaw,
    rebase,
}: {
    root: TreeEntry;
    isRebasing: boolean;
    rebase: string | undefined;
}) => {
    const entries: TreeChunkType[] = [];
    let entry: TreeEntry | undefined = root;
    let isRebasing = isRebasingRaw;
    while (entry) {
        if (entry.type !== 'commit') {
            entries.push({
                entry,
                mainDescendant: undefined,
                branchSplits: [],
                isRebasing,
            });
            break;
        }

        if (rebase === entry.metadata.oid) {
            isRebasing = true;
        }

        const branchSplits: TreeEntry[] = [...entry.branchSplits];
        sortBranches(branchSplits);
        let mainDescendant: TreeEntry | undefined;
        // This if statement handles making sure that any branches off of the
        // tip of main appear as branches, not continuations of main
        const tipBranchSplits = head(entry.branchSplits);
        if (
            branchSplits.length > 0 &&
            (!entry.metadata.onMainBranch ||
                (entry.metadata.onMainBranch &&
                    tipBranchSplits?.type === 'commit' &&
                    tipBranchSplits?.metadata.onMainBranch))
        ) {
            mainDescendant = branchSplits.shift();
        }
        branchSplits.reverse();

        entries.push({
            entry,
            mainDescendant,
            branchSplits,
            isRebasing,
        });
        entry = mainDescendant;
    }

    entries.reverse();
    return entries;
};

const TreeEntryBranches = ({
    entry,
    treeData,
    githubData,
    rebase,
    setRebase,
    isRebasing,
}: {
    entry: TreeChunkType;
    treeData: TreeData;
    githubData: GithubData;
    rebase: string | undefined;
    setRebase: (oid: string | undefined) => void;
    isRebasing: boolean;
}) => {
    const branchChunks: ReactNode[] = [];
    for (const branch of entry.branchSplits) {
        branchChunks.push(
            // eslint-disable-next-line no-use-before-define
            <TreeChunk
                key={
                    branch.type === 'commit' ? branch.metadata.oid : branch.type
                }
                root={branch}
                treeData={treeData}
                githubData={githubData}
                rebase={rebase}
                setRebase={setRebase}
                isRebasing={isRebasing}
            />,
        );
    }
    return <div style={{ marginLeft: '0px' }}>{branchChunks}</div>;
};

const TreeEntryChunkMainRow = ({
    entry,
    treeData,
    githubData,
    rebase,
    setRebase,
    isRebasing,
}: {
    entry: TreeChunkType;
    treeData: TreeData;
    githubData: GithubData;
    rebase: string | undefined;
    setRebase: (oid: string | undefined) => void;
    isRebasing: boolean;
}) => {
    const entryType = entry.entry.type;
    if (entryType === 'commit') {
        return (
            <Commit
                commit={entry.entry}
                treeData={treeData}
                githubData={githubData}
                isRebase={isRebasing}
                rebase={rebase}
                setRebase={setRebase}
            />
        );
    }
    if (entryType === 'rebase') {
        return <Rebase treeRebase={entry.entry} treeData={treeData} />;
    }
    if (entryType === 'modified') {
        return <Modified entry={entry.entry} treeData={treeData} />;
    }
    return <div>Unhandled entry type {entryType}</div>;
};

const TreeEntryChunk = ({
    entry,
    treeData,
    githubData,
    rebase,
    setRebase,
    isRebasing: isRebasingRaw,
}: {
    entry: TreeChunkType;
    treeData: TreeData;
    githubData: GithubData;
    rebase: string | undefined;
    setRebase: (oid: string | undefined) => void;
    isRebasing: boolean;
}) => {
    // TODO: Share this logic with the other instance
    const isRebasing =
        isRebasingRaw ||
        (entry.entry.type === 'commit' && rebase === entry.entry.metadata.oid);
    const mainRow = (
        <TreeEntryChunkMainRow
            entry={entry}
            treeData={treeData}
            githubData={githubData}
            rebase={rebase}
            setRebase={setRebase}
            isRebasing={isRebasing}
        />
    );
    const branches = (
        <TreeEntryBranches
            entry={entry}
            treeData={treeData}
            githubData={githubData}
            rebase={rebase}
            setRebase={setRebase}
            isRebasing={isRebasing}
        />
    );
    const hideTip = !entry.mainDescendant;
    return (
        <div style={{ display: 'flex' }}>
            <div
                style={{
                    borderLeftWidth: `${LINE_THICKNESS}px`,
                    borderColor: isRebasing ? 'red' : 'grey',
                    borderLeftStyle: 'solid',
                    marginTop: hideTip ? 15 : 0,
                }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {branches}
                {mainRow}
            </div>
        </div>
    );
};

// TODO: Rename these and fix documentation

/**
 * Adjusts empty space beneath branches, where the line is not extended
 */
const MARGIN_BRANCH_BOTTOM_EMPTY = 30;
/**
 * Adjusts the margin which controls how long the line tail is
 */
const MARGIN_BRANCH_BOTTOM_LINE = 0;

const MARGIN_BRANCH_TOP_EMPTY = 20;

const MARGIN_BRANCH_TOP_LINE = -10;

const TreeChunk = ({
    root,
    treeData,
    githubData,
    rebase,
    setRebase,
    isRebasing: isRebasingRaw,
}: {
    root: TreeEntry;
    treeData: TreeData;
    githubData: GithubData;
    rebase: string | undefined;
    setRebase: (oid: string | undefined) => void;
    isRebasing: boolean;
}) => {
    const entryChunks: ReactNode[] = [];
    const isRebasing =
        isRebasingRaw ||
        (root.type === 'commit' && rebase === root.metadata.oid);

    const entries = toEntries({ root, isRebasing, rebase });
    for (let i = 0; i < entries.length; ++i) {
        const entry = entries[i];
        entryChunks.push(
            <TreeEntryChunk
                key={
                    entry.entry.type === 'commit'
                        ? entry.entry.metadata.oid
                        : entry.entry.type
                }
                entry={entry}
                treeData={treeData}
                githubData={githubData}
                rebase={rebase}
                setRebase={setRebase}
                isRebasing={entry.isRebasing}
            />,
        );
    }

    return (
        <div
            style={{
                marginBottom: `${MARGIN_BRANCH_BOTTOM_EMPTY}px`,
                marginTop: `${MARGIN_BRANCH_TOP_EMPTY}px`,
                display: 'flex',
                position: 'relative',
            }}
        >
            <div
                style={{
                    // TODO: Move the margin above?
                    marginLeft: `${BRANCH_X_OFFSET}px`,
                }}
            />
            <div
                style={{
                    marginBottom: `${MARGIN_BRANCH_BOTTOM_LINE}px`,
                    marginTop: `${MARGIN_BRANCH_TOP_LINE}px`,
                }}
            >
                {entryChunks}
            </div>
            <BranchOff stroke={isRebasing ? 'red' : 'grey'} />
        </div>
    );
};

export const Tree = ({
    treeData,
    githubData,
}: {
    treeData: TreeData;
    githubData: GithubData;
}) => {
    const [rebase, setRebase] = useState<string>();

    useEffect(() => {
        if (rebase && treeData && !(rebase in treeData.commitMap)) {
            setRebase(undefined);
        }
    }, [rebase, treeData]);

    if (!treeData?.rootCommit) {
        return <p>No data</p>;
    }

    if (treeData.dirty && rebase) {
        // Cancel rebase if there are modifications
        setRebase(undefined);
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <TreeChunk
                root={treeData.rootCommit}
                treeData={treeData}
                rebase={rebase}
                setRebase={setRebase}
                isRebasing={false}
                githubData={githubData}
            />
        </div>
    );
};
