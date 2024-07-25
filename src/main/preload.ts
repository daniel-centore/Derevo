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
    authGithub: () => {
        return ipcRenderer.invoke('auth-github');
    },
    reloadGithub: (commits: string[]) => {
        return ipcRenderer.invoke('reload-github', commits);
    },
    logoutGithub: () => {
        return ipcRenderer.invoke('logout-github');
    },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
