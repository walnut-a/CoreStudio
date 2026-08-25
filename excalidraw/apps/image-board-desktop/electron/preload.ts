import { contextBridge, ipcRenderer } from "electron";

import {
  IPC_CHANNELS,
  type DesktopBridgeApi,
  type DesktopProjectRoomFlushRequest,
  type DesktopCurrentProject,
  type DesktopMenuEvent,
} from "../src/shared/desktopBridgeTypes";
import type { DesktopProjectRoomEventEnvelope } from "../src/shared/projectRoomProtocol";
import { isAgentErrorCode } from "../src/shared/agentBridgeTypes";
import { installNativeEditContextReporter } from "../src/shared/nativeEditContextReporter";

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
  const routeMode = new URL(window.location.href).searchParams.get(
    "desktopMode",
  );
  if (routeMode === "project") {
    document.documentElement.classList.add(
      "image-board-desktop-project-renderer",
    );
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
  getStableAgentBoardUrl: (projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.getStableAgentBoardUrl, projectPath),
  loadAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.loadAppInfo),
  openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.openExternal, url),
  inspectCodexIntegration: () =>
    ipcRenderer.invoke(IPC_CHANNELS.inspectCodexIntegration),
  installCodexIntegration: () =>
    ipcRenderer.invoke(IPC_CHANNELS.installCodexIntegration),
  inspectAgentIntegration: (host) =>
    ipcRenderer.invoke(IPC_CHANNELS.inspectAgentIntegration, host),
  installAgentIntegration: (host) =>
    ipcRenderer.invoke(IPC_CHANNELS.installAgentIntegration, host),
  removeAgentIntegration: (host) =>
    ipcRenderer.invoke(IPC_CHANNELS.removeAgentIntegration, host),
  loadProviderSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.loadProviderSettings),
  saveProviderSettings: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveProviderSettings, input),
  deleteProviderSettings: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteProviderSettings, input),
  setGenerateComposerVisible: (visible) =>
    ipcRenderer.invoke(IPC_CHANNELS.setGenerateComposerVisible, visible),
  refreshModelCatalog: () =>
    ipcRenderer.invoke(IPC_CHANNELS.refreshModelCatalog),
  generateImages: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.generateImages, input),
  cancelGenerateImages: (generationJobId) =>
    ipcRenderer.invoke(IPC_CHANNELS.cancelGenerateImages, generationJobId),
  readClipboardImage: () => ipcRenderer.invoke(IPC_CHANNELS.readClipboardImage),
  writeProjectClipboard: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.writeProjectClipboard, input),
  loadLocaleSettings: () => ipcRenderer.invoke(IPC_CHANNELS.loadLocaleSettings),
  saveLocalePreference: (preference) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveLocalePreference, preference),
  loadCanvasInteractionSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.loadCanvasInteractionSettings),
  saveTrackpadZoomSpeed: (speed) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveTrackpadZoomSpeed, speed),
  onCanvasInteractionSettingsChanged: (listener) => {
    const handler = (
      _event: unknown,
      settings: Parameters<typeof listener>[0],
    ) => listener(settings);
    ipcRenderer.on(IPC_CHANNELS.canvasInteractionSettingsChanged, handler);
    return () => {
      ipcRenderer.removeListener(
        IPC_CHANNELS.canvasInteractionSettingsChanged,
        handler,
      );
    };
  },
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
  getAgentIntegrationSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.getAgentIntegrationSettings),
  setCodexImageGenerationEnabled: (enabled) =>
    ipcRenderer.invoke(IPC_CHANNELS.setCodexImageGenerationEnabled, enabled),
  setAgentImageGenerationEnabled: (host, enabled) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.setAgentImageGenerationEnabled,
      host,
      enabled,
    ),
  joinProjectRoom: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectRoomJoin, input),
  resyncProjectRoom: (sessionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectRoomResync, sessionId),
  submitProjectRoomOperation: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectRoomOperation, input),
  flushProjectRoomPersistence: (sessionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectRoomFlushPersistence, sessionId),
  leaveProjectRoom: (sessionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectRoomLeave, sessionId),
  getProjectRoomCloseState: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectRoomCloseState, input),
  closeProjectRoom: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.projectRoomClose, input),
  onProjectRoomEvent: (listener) => {
    const handler = (
      _event: unknown,
      envelope: DesktopProjectRoomEventEnvelope,
    ) => {
      listener(envelope.sessionId, envelope.event);
    };
    ipcRenderer.on(IPC_CHANNELS.projectRoomEvent, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.projectRoomEvent, handler);
    };
  },
  loadProjectViewsState: () =>
    ipcRenderer.invoke(IPC_CHANNELS.loadProjectViewsState),
  openProjectView: (projectPath, options) =>
    ipcRenderer.invoke(IPC_CHANNELS.openProjectView, projectPath, options),
  activateProjectView: (projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.activateProjectView, projectPath),
  closeProjectView: (projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.closeProjectView, projectPath),
  reorderProjectViews: (projectPaths) =>
    ipcRenderer.invoke(IPC_CHANNELS.reorderProjectViews, projectPaths),
  recoverProjectView: (projectPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.recoverProjectView, projectPath),
  notifyProjectThemeChanged: (payload) => {
    ipcRenderer.send(IPC_CHANNELS.projectThemeChanged, payload);
  },
  onProjectViewsState: (listener) => {
    const handler = (
      _event: unknown,
      state: import("../src/shared/desktopBridgeTypes").DesktopProjectViewsState,
    ) => {
      listener(state);
    };
    ipcRenderer.on(IPC_CHANNELS.projectViewsState, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.projectViewsState, handler);
    };
  },
  onFlushProjectRoomRequest: (listener) => {
    const handler = async (
      _event: unknown,
      request: DesktopProjectRoomFlushRequest,
    ) => {
      try {
        await listener();
        ipcRenderer.send(IPC_CHANNELS.flushProjectRoomResponse, {
          requestId: request.requestId,
          ok: true,
        });
      } catch (error) {
        ipcRenderer.send(IPC_CHANNELS.flushProjectRoomResponse, {
          requestId: request.requestId,
          ok: false,
          errorMessage:
            error instanceof Error ? error.message : String(error || ""),
        });
      }
    };
    ipcRenderer.on(IPC_CHANNELS.flushProjectRoomRequest, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.flushProjectRoomRequest, handler);
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

installNativeEditContextReporter((nativeTextContext) => {
  ipcRenderer.send(IPC_CHANNELS.nativeEditContextChanged, nativeTextContext);
});
contextBridge.exposeInMainWorld("imageBoardDesktop", desktopBridge);
