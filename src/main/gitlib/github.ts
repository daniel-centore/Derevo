import { BrowserWindow } from 'electron';
import { Octokit, RequestError } from 'octokit';
import {
    createOAuthDeviceAuth,
    GitHubAppAuthentication,
    GitHubAppAuthenticationWithExpiration,
} from '@octokit/auth-oauth-device';
import { isNil } from 'lodash';
import { refreshToken } from '@octokit/oauth-methods';
import {
    GithubData,
    GithubPR,
    GithubStatus,
    TreeCommit,
    TreeData,
} from '../../types/types';
import { getLatestTree } from './git-tree';
import {
    getGithubAuthentication,
    setGithubAuthentication,
} from '../app-settings';
import { sleep } from '../main-util';

type PrData = Awaited<
    ReturnType<Octokit['rest']['repos']['listPullRequestsAssociatedWithCommit']>
>;

type PrsData = {
    prData: PrData;
};

const prCache: Record<string, PrsData> = {};

const CLIENT_ID = 'Iv23liB0k31dxsOxfwNC';

// const { createOAuthDeviceAuth } = require('esm')('@octokit/auth-oauth-device');

const setGithubStatus = ({
    mainWindow,
    status,
}: {
    mainWindow: BrowserWindow | undefined;
    status: GithubStatus;
}) => {
    mainWindow?.webContents.send('github-status', status);
};

export const authGithub = async ({
    mainWindow,
}: {
    mainWindow: BrowserWindow | undefined;
}) => {
    const auth = createOAuthDeviceAuth({
        clientType: 'github-app',
        clientId: CLIENT_ID,
        onVerification(verification) {
            mainWindow?.webContents.send(
                'github-verification-ready',
                verification,
            );
        },
    });

    let tokenAuthentication:
        | GitHubAppAuthentication
        | GitHubAppAuthenticationWithExpiration;
    try {
        tokenAuthentication = await auth({
            type: 'oauth',
        });
    } catch (e) {
        // Github verification expired
        // TODO: Communicate in UI
        console.log('Github verification expired');
        return;
    }

    await setGithubAuthentication(tokenAuthentication);

    mainWindow?.webContents.send('github-auth-success');
};

const getAuthenticationToken = async ({
    mainWindow,
}: {
    mainWindow: BrowserWindow | undefined;
}): Promise<string | null> => {
    const auth = await getGithubAuthentication();
    if (isNil(auth)) {
        setGithubStatus({ mainWindow, status: { status: 'logged-out' } });
        return null;
    }
    if (new Date(auth.refreshTokenExpiresAt) < new Date()) {
        // If the refresh token is expired, user needs to reauth
        setGithubStatus({ mainWindow, status: { status: 'logged-out' } });
        return null;
    }
    if (new Date(auth.expiresAt) < new Date()) {
        console.log('Refreshing...');
        const { authentication: refreshedAuth } = await refreshToken({
            clientType: 'github-app',
            clientId: CLIENT_ID,
            clientSecret: undefined as any, // this is not needed for device flow
            refreshToken: auth.refreshToken,
        });
        setGithubAuthentication(refreshedAuth);
        console.log('Refreshed!');
        setGithubStatus({ mainWindow, status: { status: 'authenticated' } });
        return refreshedAuth.token;
    }
    setGithubStatus({ mainWindow, status: { status: 'authenticated' } });
    return auth.token;
};

// TODO: Auth
// TODO: Throttling https://github.com/octokit/plugin-throttling.js?tab=readme-ov-file
// https://github.com/settings/tokens/new?scopes=repo

let reloadInProgress = false;

const getPrsForBranch = async (
    mainWindow: BrowserWindow,
    owner: string,
    repo: string,
    branch: string,
): Promise<PrsData | null> => {
    const token = await getAuthenticationToken({ mainWindow });
    if (!token) {
        return null;
    }

    const octokit = new Octokit({ auth: token });
    const oldValue = branch in prCache ? prCache[branch] : null;

    // git for-each-ref --format='%(upstream:short)' refs/heads/dfc/new-commit
    console.log(`${owner}:${branch}`);

    let result: PrData;
    try {
        result = await octokit.rest.pulls.list({
            owner,
            repo,
            state: 'all',
            head: `${owner}:${branch}`,
            headers: {
                ...(oldValue && {
                    // This allows our API call to not count toward throttling unless something has
                    // actually changed
                    'if-none-match': oldValue.prData.headers.etag,
                }),
            },
        });
    } catch (e) {
        // TODO: Rate limiting: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

        // Expected errors
        const status = (e as RequestError).status;
        const rateLimit = (e as RequestError).response?.headers[
            'x-ratelimit-remaining'
        ];
        console.log(`Rate limit remaining: ${rateLimit}`);
        // 422 - No commit found for SHA
        if (status === 422) {
            console.log('422 - No commit found');
            delete prCache[branch];
            return null;
        }

        // 304 - Not Modified
        if (status === 304) {
            console.log('422 - Not modified');
            return oldValue;
        }

        // 404 - Not Found
        // This is also used when we don't have permission
        if (status === 404) {
            console.log('404 - Not found (or permission not granted)');
            setGithubStatus({ mainWindow, status: { status: 'auth-bad' } });
            // Prevents us from killing our rate limit
            await sleep(10000);
            return null;
        }

        console.log('Error', e);
        return null;
    }

    const rateLimit = result.headers['x-ratelimit-remaining'];
    console.log(`Rate limit remaining: ${rateLimit}`);

    const response = { prData: result };
    prCache[branch] = response;
    // console.log('Response', { response: response.prData.data });
    // console.log('Cache', { prCache: response.prData.data });
    return response;
};

export const getPrsForBranches = async (
    mainWindow: BrowserWindow,
    owner: string,
    repo: string,
    branches: string[],
): Promise<GithubData> => {
    const results: GithubData = {};
    for (const branch of branches) {
        // eslint-disable-next-line no-await-in-loop
        const result = await getPrsForBranch(mainWindow, owner, repo, branch);
        if (result) {
            const entry: GithubPR[] = result.prData.data.map((x) => ({
                branchName: branch,
                url: x.html_url,
                status:
                    x.state === 'closed'
                        ? x.merged_at
                            ? 'merged'
                            : 'closed'
                        : x.draft
                          ? 'draft'
                          : 'open',
                prNumber: x.number,
            }));
            entry.sort((a, b) => a.prNumber - b.prNumber);
            results[branch] = entry;
        }
    }
    return results;
};

const getBranchesFromTree = (tree: TreeData | null) => {
    return tree
        ? [
              ...new Set(
                  (Object.values(tree.commitMap) as TreeCommit[]).flatMap(
                      (x) => x.metadata.branches,
                  ),
              ),
          ]
        : [];
};

const extractGithubDetails = (url: string) => {
    const regex = /https:\/\/github\.com\/([^/]+)\/([^/]+)\.git/;
    const match = url.match(regex);

    if (match) {
        return {
            owner: match[1],
            repo: match[2],
        };
    }
    return null;
};

export const reloadGithub = async ({
    mainWindow,
}: {
    mainWindow: BrowserWindow | undefined;
}) => {
    if (!mainWindow) {
        return;
    }
    if (reloadInProgress) {
        console.log('Reload already in progress');
        return;
    }

    const tree = getLatestTree();
    if (!tree || !tree.remote) {
        return;
    }

    const githubDetails = extractGithubDetails(tree.remote.url);
    if (!githubDetails) {
        return;
    }
    const { owner, repo } = githubDetails;

    reloadInProgress = true;

    const branches = getBranchesFromTree(tree);
    try {
        const result = await getPrsForBranches(
            mainWindow,
            owner,
            repo,
            branches
                .map((x) => x.branchName)
                .filter((x) => x !== tree.mainBranchName),
        );
        mainWindow?.webContents.send('github-updated', result);
    } catch (e) {
        console.error(e);
    }
    reloadInProgress = false;
};

const REFRESH_FREQUENCY = 5000;
export const autoReloadGithub = async ({
    mainWindow,
}: {
    mainWindow: BrowserWindow | undefined;
}) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
        return;
    }
    await reloadGithub({ mainWindow });
    setTimeout(() => autoReloadGithub({ mainWindow }), REFRESH_FREQUENCY);
};
