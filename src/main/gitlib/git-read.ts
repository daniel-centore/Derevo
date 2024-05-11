import util from 'util';
import fs from 'fs';
import { exec } from 'child_process';
import { ChangeType } from '../../types/types';

export const getModifiedFiles = async (dir: string) => {
    // Cannot use isomorphic git here because it currently differs from git behavior:
    // https://github.com/isomorphic-git/isomorphic-git/issues/1215

    const execPromise = util.promisify(exec);
    const { stdout } = await execPromise(
        'git status --porcelain -z --no-renames',
        {
            cwd: dir,
        },
    );

    const statusMapping: Record<
        string,
        { change: ChangeType; staged: boolean } | null
    > = {
        'M ': { change: 'modified', staged: true },
        'T ': { change: 'modified', staged: true },
        'D ': { change: 'deleted', staged: true },
        ' M': { change: 'modified', staged: false },
        ' T': { change: 'modified', staged: false },
        ' D': { change: 'deleted', staged: false },
        MM: { change: 'modified', staged: false },
        UU: { change: 'modified', staged: false },
        AA: { change: 'modified', staged: false },
        '??': { change: 'new', staged: false },
    };

    const parsed = stdout
        .split('\0')
        .filter((row) => row.trim().length > 0)
        .flatMap((row) => {
            const mapping = statusMapping[row.substring(0, 2)];
            if (!mapping) {
                return [];
            }
            return [
                {
                    change: mapping?.change,
                    staged: mapping?.staged,
                    filename: row.substring(3),
                },
            ];
        });

    return parsed;
};

export const rebaseInProgress = async (dir: string) => {
    const existsPromise = util.promisify(fs.exists);
    const rebaseFolderExists = (
        await Promise.all([
            existsPromise(`${dir}/.git/rebase-apply`),
            existsPromise(`${dir}/.git/rebase-merge`),
        ])
    ).some((x) => x);
    return rebaseFolderExists;
};
