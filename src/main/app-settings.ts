import settings from 'electron-settings';

export const getCwd = async (): Promise<string | null> => {
  const result = await settings.get('cwd');
  if (typeof result !== 'string') {
    return null;
  }
  return result;
};

export const setCwd = (cwd: string) => settings.set('cwd', cwd);
