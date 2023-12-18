import { IpcRendererEvent } from 'electron';
import { useEffect, useRef } from 'react';

type EventHandler = (...args: any[]) => void;

export const useIpcListener = (channel: string, listener: EventHandler) => {
  const savedHandler = useRef<EventHandler>();
  useEffect(() => {
    savedHandler.current = listener;
  }, [listener]);
  useEffect(() => {
    // const ipcRenderer = window.electron.ipcRenderer;
    // if (!ipcRenderer)
    //   throw new Error(
    //     'electron-use-ipc-listener: Use useIpcListener in the Renderer process only',
    //   );
    // const eventHandler: EventHandler = (event, ...rest) =>
    //   savedHandler.current?.(event, ...rest);
    // ipcRenderer.on(channel, eventHandler);
    // return () => {
    //   ipcRenderer.removeListener(channel, eventHandler);
    // };
    const unsubscribe = window.electron.api.on(channel, listener);
    return () => unsubscribe();
  }, [channel, listener]);
};
