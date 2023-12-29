import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Command, TreeCommit } from '../types/types';

// export type Channels = 'ipc-example' | 'extractGitTree';

const electronHandler = {
  invoke: (channel: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(channel, args);
  },
  runCommands: (cmds: Command[]) => {
    return ipcRenderer.invoke('run-cmds', cmds);
  },
  rebase: (args: { from: TreeCommit; to: string }) => {
    return ipcRenderer.invoke('rebase', args);
  },
  openExternal: (url: string) => {
    return ipcRenderer.invoke('open-external', url);
  },
  delete: (files: string[]) => {
    return ipcRenderer.invoke('delete', files);
  },
  // sendMessage(channel: Channels, ...args: unknown[]) {
  //   ipcRenderer.send(channel, ...args);
  // },
  on(channel: string, func: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      func(...args);
    ipcRenderer.on(channel, subscription);

    return () => {
      // console.log('Remove listener');
      ipcRenderer.removeListener(channel, subscription);
    };
  },
  // once(channel: Channels, func: (...args: unknown[]) => void) {
  //   ipcRenderer.once(channel, (_event, ...args) => func(...args));
  // },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
