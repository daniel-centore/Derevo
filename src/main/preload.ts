import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// export type Channels = 'ipc-example' | 'extractGitTree';

const electronHandler = {
  // ipcRenderer,
  api: {
    invoke: (channel: string, ...args: unknown[]) => {
      return ipcRenderer.invoke(channel, args);
    },
    // sendMessage(channel: Channels, ...args: unknown[]) {
    //   ipcRenderer.send(channel, ...args);
    // },
    on(channel: string, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        console.log('Remove listener');
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    // once(channel: Channels, func: (...args: unknown[]) => void) {
    //   ipcRenderer.once(channel, (_event, ...args) => func(...args));
    // },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
