import settings from 'electron-settings';
import { isNil } from 'lodash';
import { GitHubAppAuthenticationWithRefreshToken } from '@octokit/oauth-methods';
import {
    GitHubAppAuthentication,
    GitHubAppAuthenticationWithExpiration,
} from '@octokit/auth-oauth-device';
import { GithubStatus } from '../types/types';

export const getCwd = async (): Promise<string | null> => {
    const result = await settings.get('cwd');
    if (typeof result !== 'string') {
        return null;
    }
    return result;
};

export const setCwd = (cwd: string) => settings.set('cwd', cwd);

export const getGithubAuthentication =
    async (): Promise<GitHubAppAuthenticationWithRefreshToken | null> => {
        const result = await settings.get('gh-auth');
        if (isNil(result)) {
            return null;
        }
        return result as GitHubAppAuthenticationWithRefreshToken;
    };

export const setGithubAuthentication = (
    auth:
        | GitHubAppAuthenticationWithRefreshToken
        | GitHubAppAuthentication
        | GitHubAppAuthenticationWithExpiration
        | null,
) => settings.set('gh-auth', auth);
