import settings from 'electron-settings';

export const getCwd = async (): Promise<string | null> => {
    const result = await settings.get('cwd');
    if (typeof result !== 'string') {
        return null;
    }
    return result;
};

export const setCwd = (cwd: string) => settings.set('cwd', cwd);

export const getGithubToken = async (): Promise<string | null> => {
    const result = await settings.get('gh-token');
    if (typeof result !== 'string') {
        return null;
    }
    return result;
};

export const setGithubToken = (cwd: string) => settings.set('gh-token', cwd);
