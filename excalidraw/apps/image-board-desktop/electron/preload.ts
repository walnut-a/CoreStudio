import { contextBridge, ipcRenderer } from "electron";

import {
  IPC_CHANNELS,
  type DesktopBridgeApi,
  type DesktopMenuEvent,
} from "../src/shared/desktopBridgeTypes";

const desktopBridge: DesktopBridgeApi = {
  createProject: () => ipcRenderer.invoke(IPC_CHANNELS.createProject),
  openProject: () => ipcRenderer.invoke(IPC_CHANNELS.openProject),
  openRecentProject: (projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.openRecentProject, projectPath),
  loadRecentProjects: () => ipcRenderer.invoke(IPC_CHANNELS.loadRecentProjects),
  writeProjectScene: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.writeProjectScene, input),
  readProjectAssetPayloads: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.readProjectAssetPayloads, input),
  persistImageAssets: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.persistImageAssets, input),
  importImages: () => ipcRenderer.invoke(IPC_CHANNELS.importImages),
  revealProjectInFinder: (projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.revealProjectInFinder, projectPath),
  loadProviderSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.loadProviderSettings),
  saveProviderSettings: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveProviderSettings, input),
  generateImages: (input) => ipcRenderer.invoke(IPC_CHANNELS.generateImages, input),
  onMenuAction: (listener) => {
    const handler = (_event: unknown, menuEvent: DesktopMenuEvent) => {
      listener(menuEvent);
    };
    ipcRenderer.on(IPC_CHANNELS.menuAction, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.menuAction, handler);
    };
  },
};

contextBridge.exposeInMainWorld("imageBoardDesktop", desktopBridge);
