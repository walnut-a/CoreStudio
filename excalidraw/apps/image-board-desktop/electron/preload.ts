import { contextBridge, ipcRenderer } from "electron";

import {
  IPC_CHANNELS,
  type DesktopBridgeApi,
  type DesktopAutosaveFlushRequest,
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
  loadPromptLibrary: () => ipcRenderer.invoke(IPC_CHANNELS.loadPromptLibrary),
  savePrompt: (input) => ipcRenderer.invoke(IPC_CHANNELS.savePrompt, input),
  deleteSavedPrompt: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteSavedPrompt, id),
  markSavedPromptUsed: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.markSavedPromptUsed, id),
  generateImages: (input) => ipcRenderer.invoke(IPC_CHANNELS.generateImages, input),
  readClipboardImage: () => ipcRenderer.invoke(IPC_CHANNELS.readClipboardImage),
  onMenuAction: (listener) => {
    const handler = (_event: unknown, menuEvent: DesktopMenuEvent) => {
      listener(menuEvent);
    };
    ipcRenderer.on(IPC_CHANNELS.menuAction, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.menuAction, handler);
    };
  },
  notifyRendererReady: () => {
    ipcRenderer.send(IPC_CHANNELS.rendererReady);
  },
  onFlushAutosaveRequest: (listener) => {
    const handler = async (
      _event: unknown,
      request: DesktopAutosaveFlushRequest,
    ) => {
      try {
        await listener();
        ipcRenderer.send(IPC_CHANNELS.flushAutosaveResponse, {
          requestId: request.requestId,
          ok: true,
        });
      } catch (error) {
        ipcRenderer.send(IPC_CHANNELS.flushAutosaveResponse, {
          requestId: request.requestId,
          ok: false,
          errorMessage:
            error instanceof Error ? error.message : String(error || ""),
        });
      }
    };
    ipcRenderer.on(IPC_CHANNELS.flushAutosaveRequest, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.flushAutosaveRequest, handler);
    };
  },
};

contextBridge.exposeInMainWorld("imageBoardDesktop", desktopBridge);
