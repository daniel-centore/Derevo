import { BrowserWindow } from 'electron';
import { Octokit, App, RequestError } from 'octokit';
import { GithubData, TreeCommit, TreeData } from '../../types/types';
import { getLatestTree } from './git-tree';

type PrData = Awaited<
  ReturnType<Octokit['rest']['repos']['listPullRequestsAssociatedWithCommit']>
>;

type PrsData = {
  prData: PrData;
};

const prCache: Record<string, PrsData> = {};

// TODO: Auth
// TODO: Throttling https://github.com/octokit/plugin-throttling.js?tab=readme-ov-file
// https://github.com/settings/tokens/new?scopes=repo
const TOKEN = 'TODO';
const octokit = new Octokit({ auth: TOKEN });

let reloadInProgress = false;

const getPrsForBranch = async (
  owner: string,
  repo: string,
  branch: string,
): Promise<PrsData | null> => {
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
  owner: string,
  repo: string,
  branches: string[],
): Promise<GithubData> => {
  const results: GithubData = {};
  for (const branch of branches) {
    // eslint-disable-next-line no-await-in-loop
    const result = await getPrsForBranch(owner, repo, branch);
    if (result) {
      results[branch] = result.prData.data.map((x) => ({
        branchName: branch,
        url: x.html_url,
        status:
          x.state === 'closed' ? (x.merged_at ? 'merged' : 'closed') : 'open',
        prNumber: x.number,
      }));
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
      owner,
      repo,
      branches.map((x) => x.branchName),
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
