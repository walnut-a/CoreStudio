import { contextBridge, ipcRenderer } from "electron";

import {
  IPC_CHANNELS,
  type DesktopBridgeApi,
  type DesktopAutosaveFlushRequest,
  type DesktopCurrentProject,
  type DesktopMenuEvent,
} from "../src/shared/desktopBridgeTypes";
import { isAgentErrorCode } from "../src/shared/agentBridgeTypes";

import type {
  AgentRendererCommandRequest,
  AgentRendererCommandResponse,
} from "../src/shared/agentBridgeTypes";

const getAgentErrorCode = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "code" in error &&
  isAgentErrorCode(error.code)
    ? error.code
    : undefined;

const getAgentErrorDetails = (error: unknown) =>
  error && typeof error === "object" && "details" in error
    ? error.details
    : undefined;

const markHiddenDesktopTitlebar = () => {
  if (process.platform !== "darwin") {
    return;
  }
  document.documentElement.classList.add("image-board-desktop-titlebar-hidden");
};

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", markHiddenDesktopTitlebar, {
    once: true,
  });
} else {
  markHiddenDesktopTitlebar();
}

const desktopBridge: DesktopBridgeApi = {
  createProject: () => ipcRenderer.invoke(IPC_CHANNELS.createProject),
  openProject: () => ipcRenderer.invoke(IPC_CHANNELS.openProject),
  openRecentProject: (projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.openRecentProject, projectPath),
  loadRecentProjects: () => ipcRenderer.invoke(IPC_CHANNELS.loadRecentProjects),
  removeRecentProject: (projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.removeRecentProject, projectPath),
  writeProjectScene: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.writeProjectScene, input),
  applyProjectSceneElementPatches: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.applyProjectSceneElementPatches, input),
  readProjectAssetPayloads: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.readProjectAssetPayloads, input),
  inspectProjectHealth: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.inspectProjectHealth, input),
  rebuildProjectThumbnails: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.rebuildProjectThumbnails, input),
  cleanProjectCache: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.cleanProjectCache, input),
  persistImageAssets: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.persistImageAssets, input),
  beginImageWriteback: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.beginImageWriteback, input),
  commitImageWriteback: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.commitImageWriteback, input),
  rollbackImageWriteback: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.rollbackImageWriteback, input),
  importImages: () => ipcRenderer.invoke(IPC_CHANNELS.importImages),
  revealProjectInFinder: (projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.revealProjectInFinder, projectPath),
  loadAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.loadAppInfo),
  openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.openExternal, url),
  inspectCodexIntegration: () =>
    ipcRenderer.invoke(IPC_CHANNELS.inspectCodexIntegration),
  installCodexIntegration: () =>
    ipcRenderer.invoke(IPC_CHANNELS.installCodexIntegration),
  loadProviderSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.loadProviderSettings),
  saveProviderSettings: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveProviderSettings, input),
  deleteProviderSettings: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteProviderSettings, input),
  generateImages: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.generateImages, input),
  cancelGenerateImages: (generationJobId) =>
    ipcRenderer.invoke(IPC_CHANNELS.cancelGenerateImages, generationJobId),
  readClipboardImage: () => ipcRenderer.invoke(IPC_CHANNELS.readClipboardImage),
  loadLocaleSettings: () => ipcRenderer.invoke(IPC_CHANNELS.loadLocaleSettings),
  saveLocalePreference: (preference) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveLocalePreference, preference),
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
  notifyProjectStateChanged: (currentProject: DesktopCurrentProject | null) => {
    ipcRenderer.send(IPC_CHANNELS.projectStateChanged, {
      currentProject,
    });
  },
  getAgentBridgeStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getAgentBridgeStatus),
  setAgentBridgeEnabled: (enabled) =>
    ipcRenderer.invoke(IPC_CHANNELS.setAgentBridgeEnabled, enabled),
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
  onAgentCommandRequest: (listener) => {
    const handler = async (
      _event: unknown,
      request: AgentRendererCommandRequest,
    ) => {
      try {
        const data = await listener(request);
        const response: AgentRendererCommandResponse = {
          requestId: request.requestId,
          ok: true,
          data,
        };
        ipcRenderer.send(IPC_CHANNELS.agentCommandResponse, response);
      } catch (error) {
        const response: AgentRendererCommandResponse = {
          requestId: request.requestId,
          ok: false,
          errorCode: getAgentErrorCode(error),
          errorMessage:
            error instanceof Error ? error.message : String(error || ""),
          errorDetails: getAgentErrorDetails(error),
        };
        ipcRenderer.send(IPC_CHANNELS.agentCommandResponse, response);
      }
    };
    ipcRenderer.on(IPC_CHANNELS.agentCommandRequest, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.agentCommandRequest, handler);
    };
  },
};

contextBridge.exposeInMainWorld("imageBoardDesktop", desktopBridge);
