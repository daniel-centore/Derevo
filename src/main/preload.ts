import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Command, RebaseResult, TreeCommit } from '../types/types';

const electronHandler = {
  invoke: (channel: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(channel, args);
  },
  runCommands: (cmds: Command[]): Promise<number> => {
    return ipcRenderer.invoke('run-cmds', cmds);
  },
  rebase: (args: {
    from: TreeCommit;
    to: string;
    skipFirstRebase: boolean;
  }): Promise<RebaseResult> => {
    return ipcRenderer.invoke('rebase', args);
  },
  openExternal: (url: string) => {
    return ipcRenderer.invoke('open-external', url);
  },
  delete: (files: string[]) => {
    return ipcRenderer.invoke('delete', files);
  },
  on(channel: string, func: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      func(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  getFolder: (): Promise<string | undefined> => {
    return ipcRenderer.invoke('get-folder');
  },
  setCwd: (cwd: string) => {
    return ipcRenderer.invoke('set-cwd', cwd);
  },
  setGithubToken: (token: string) => {
    return ipcRenderer.invoke('set-github-token', token);
  },
  getGithubToken: () => {
    return ipcRenderer.invoke('get-github-token');
  },
  reloadGithub: (commits: string[]) => {
    return ipcRenderer.invoke('reload-github', commits);
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
