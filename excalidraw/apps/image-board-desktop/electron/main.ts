import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import path from "path";
import type { BaseWindow, IpcMainEvent } from "electron";

import {
  BrowserWindow,
  Menu,
  app,
  clipboard,
  dialog,
  ipcMain,
  nativeImage,
  shell,
} from "electron";

import {
  IPC_CHANNELS,
  type DesktopProjectRoomFlushResponse,
  type DesktopMenuEvent,
  type DesktopAgentBridgeStatus,
  type DesktopProjectStateChangedPayload,
  type DesktopProjectBundle,
  type RecentProjectEntry,
  type DeleteProviderSettingsInput,
  type GenerateImagesInput,
  type SaveProviderSettingsInput,
} from "../src/shared/desktopBridgeTypes";
import type { DesktopLocalePreference } from "../src/shared/desktopLocale";
import type {
  DesktopProjectRoomEventEnvelope,
  DesktopProjectRoomJoinInput,
  ProjectRoomSceneOperation,
} from "../src/shared/projectRoomProtocol";
import {
  buildMissingRecentProjectMessage,
  isMissingProjectFileError,
  markMissingRecentProjectMessage,
  unmarkMissingRecentProjectMessage,
} from "../src/shared/recentProjectErrors";
import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  type AgentRendererCommandName,
  type AgentRendererCommandResponse,
} from "../src/shared/agentBridgeTypes";
import { PROJECT_FILENAMES } from "../src/shared/projectTypes";
import {
  beginProjectImageWriteback,
  commitProjectImageWriteback,
  rollbackProjectImageWriteback,
} from "./project/projectImageWriteback";
import {
  cleanProjectCache,
  createProjectStructure,
  inspectProjectHealth,
  persistImageAssets,
  readProjectAssetPayloads,
  readProjectBundle,
  rebuildProjectThumbnails,
  writeProjectScene,
} from "./projectFs";
import {
  chooseCreateProjectDirectory,
  chooseOpenProjectDirectory,
} from "./projectDialogs";
import { generateImages } from "./providers";
import { createGenerationRequestController } from "./generationRequestController";
import {
  deleteProviderSettings,
  loadProviderSettings,
  saveProviderSettings,
} from "./settingsStore";
import {
  loadAgentAccessSettings,
  saveAgentAccessSettings,
} from "./agent/agentAccessStore";
import { buildAgentBoardUrl } from "./agent/agentBoardUrl";
import {
  loadRecentProjects,
  rememberRecentProject,
  removeRecentProject,
} from "./recentProjectsStore";
import {
  DESKTOP_APP_NAME,
  DESKTOP_LANG_CODE,
  setActiveDesktopLocale,
} from "../src/app/copy";
import { selectProjectRoomAgentPresence } from "../src/app/projectRoomPresence";
import { DESKTOP_APP_VERSION } from "./appVersion";
import { createAppMenuTemplate } from "./menu";
import {
  createMainProcessErrorReporter,
  installMainProcessErrorHandlers,
} from "./mainProcessErrors";
import { shouldOpenDevTools } from "./devtools";
import { createQuitState } from "./windowLifecycle";
import { disableRendererPageZoom } from "./windowZoomGuard";
import {
  inspectCodexIntegration,
  installCodexIntegration,
} from "./codexIntegrationService";
import {
  createSingleInstanceController,
  focusExistingWindow,
} from "./singleInstance";
import {
  createLocalBridgeServer,
  type LocalBridgeCurrentProject,
  type LocalBridgeServerHandle,
} from "./agent/localBridgeServer";
import {
  removeAgentSessionDescriptor,
  writeAgentSessionDescriptor,
} from "./agent/sessionStore";
import { getAgentSessionPath } from "./agent/sessionPaths";
import { createTaskGrantStore } from "./agent/taskGrants";
import { createRendererCommandBridge } from "./agent/rendererCommandBridge";
import { configureNoSystemKeychainAccess } from "./keychainGuard";
import { installBrokenPipeConsoleGuard } from "./safeProcessLogging";
import { createLocaleSettingsStore } from "./localeSettingsStore";
import { createLocaleSettingsController } from "./localeSettingsController";
import { createProjectRoomService } from "./room/projectRoomService";
import { createProjectRoomIpcController } from "./room/projectRoomIpcController";
import { createProjectRoomTicketStore } from "./room/projectRoomTicketStore";
import { ProjectRoomError } from "./room/projectRoom";
import {
  collectProjectRoomAgentImageFileIds,
  readProjectRoomAgentScene,
} from "./room/projectRoomAgentRead";

installBrokenPipeConsoleGuard();

let mainWindow: BrowserWindow | null = null;
let currentRecentProjects: RecentProjectEntry[] = [];
let currentProject: LocalBridgeCurrentProject | null = null;
let latestProjectOpenRequestId = 0;
let latestProjectRoomFlushRequestId = 0;
let rendererReady = false;
let allowWindowClose = false;
let localBridgeHandle: LocalBridgeServerHandle | null = null;
let rendererCommandBridge: ReturnType<
  typeof createRendererCommandBridge
> | null = null;
let agentAccessEnabled = false;
let localBridgeCleanupStarted = false;
let localBridgeCleanupFinished = false;
let agentSessionWriteChain: Promise<void> = Promise.resolve();
let localeSettingsController: ReturnType<
  typeof createLocaleSettingsController
> | null = null;
const quitState = createQuitState();
const agentSessionPath = getAgentSessionPath();
const taskGrantStore = createTaskGrantStore();
const participantIssuerToken = randomUUID();
const projectRoomTicketStore = createProjectRoomTicketStore();
const projectRoomService = createProjectRoomService({
  readProjectBundle,
  writeProjectScene,
});
const projectRoomIpcController = createProjectRoomIpcController({
  openProject: (projectPath) => projectRoomService.openProject(projectPath),
});
const generationRequestController = createGenerationRequestController({
  generateImages,
});
const AGENT_GENERATE_IMAGES_TIMEOUT_MS = 180_000;
const AGENT_BRIDGE_PREFERRED_PORT = 60909;
const PACKAGED_SMOKE_READY_SIGNAL = "[corestudio:smoke-ready]";
const pendingRendererMenuEvents: DesktopMenuEvent[] = [];
const pendingProjectRoomFlushes = new Map<
  number,
  {
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

const rendererUrl = process.env.ELECTRON_RENDERER_URL ?? null;
const isDev = Boolean(rendererUrl);

configureNoSystemKeychainAccess(app.commandLine);
app.setName(DESKTOP_APP_NAME);

installMainProcessErrorHandlers(
  process,
  createMainProcessErrorReporter({
    appName: DESKTOP_APP_NAME,
    getLogPath: () =>
      path.join(
        app.getPath("appData"),
        "Excalidraw Image Board",
        "logs",
        "main-process-errors.log",
      ),
    showErrorBox: (title, content) => {
      dialog.showErrorBox(title, content);
    },
  }),
);

const getTargetWindow = (ownerWindow?: BaseWindow | null) => {
  if (ownerWindow instanceof BrowserWindow && !ownerWindow.isDestroyed()) {
    return ownerWindow;
  }
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
};

const hasSingleInstanceLock = createSingleInstanceController(app).install(
  () => {
    focusExistingWindow(getTargetWindow());
  },
);

const isClipboardPermission = (permission: string) =>
  permission === "clipboard-read" || permission === "clipboard-sanitized-write";

const configureRendererPermissions = (targetWindow: BrowserWindow) => {
  const targetWebContents = targetWindow.webContents;

  targetWebContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      callback(
        webContents.id === targetWebContents.id &&
          isClipboardPermission(permission),
      );
    },
  );

  targetWebContents.session.setPermissionCheckHandler(
    (webContents, permission) =>
      webContents?.id === targetWebContents.id &&
      isClipboardPermission(permission),
  );
};

const sendRendererMenuEvent = (
  event: DesktopMenuEvent,
  ownerWindow?: BaseWindow | null,
) => {
  const targetWindow = getTargetWindow(ownerWindow);
  if (!targetWindow || targetWindow.webContents.isDestroyed()) {
    return;
  }

  if (!rendererReady) {
    pendingRendererMenuEvents.push(event);
    return;
  }

  targetWindow.webContents.send(IPC_CHANNELS.menuAction, event);
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error || "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getAgentRendererCommandTimeoutMs = (
  command: AgentRendererCommandName,
  payload?: unknown,
) => {
  if (
    command === "desktop.bridge" &&
    isRecord(payload) &&
    payload.method === "generateImages"
  ) {
    return AGENT_GENERATE_IMAGES_TIMEOUT_MS;
  }

  return undefined;
};

const getCurrentProject = (): LocalBridgeCurrentProject | null =>
  currentProject ? { ...currentProject } : null;

const getAgentProjectByToken = async (
  token: string,
): Promise<LocalBridgeCurrentProject | null> => {
  if (currentProject?.agentAccess.token === token) {
    return { ...currentProject };
  }

  const recentProjects = await loadRecentProjects();
  for (const project of recentProjects) {
    if (currentProject?.projectPath === project.projectPath) {
      continue;
    }

    try {
      const bundle = await readProjectBundle(project.projectPath);
      if (bundle.project.agentAccess.token === token) {
        return {
          projectPath: project.projectPath,
          name: bundle.project.name,
          agentAccess: bundle.project.agentAccess,
        };
      }
    } catch {
      // Stale recent entries are ignored here; normal project open will prune them.
    }
  }

  return null;
};

const getAgentBoardUrl = () => {
  return buildAgentBoardUrl({
    agentAccessEnabled,
    bridgeBaseUrl: localBridgeHandle?.baseUrl ?? null,
    rendererUrl,
  });
};

const getAgentBridgeStatus = (): DesktopAgentBridgeStatus => ({
  enabled: agentAccessEnabled,
  ready: Boolean(localBridgeHandle),
  currentProject: getCurrentProject(),
  boardUrl: getAgentBoardUrl(),
});

const shouldSkipAgentSessionWrite = () =>
  localBridgeCleanupStarted || localBridgeCleanupFinished;

const writeCurrentAgentSessionDescriptor = async () => {
  const bridge = localBridgeHandle;
  if (!bridge || !agentAccessEnabled || shouldSkipAgentSessionWrite()) {
    return;
  }

  const projectToken = currentProject?.agentAccess.token ?? "";
  const descriptor = {
    protocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
    appName: DESKTOP_APP_NAME,
    appVersion: DESKTOP_APP_VERSION,
    bridge: {
      host: bridge.host,
      port: bridge.port,
      baseUrl: bridge.baseUrl,
    },
    projectToken,
    participantIssuerToken,
    readToken: projectToken,
    boardUrl: getAgentBoardUrl(),
    currentProject: getCurrentProject(),
    updatedAt: new Date().toISOString(),
  } as const;

  agentSessionWriteChain = agentSessionWriteChain
    .catch(() => undefined)
    .then(async () => {
      if (
        !agentAccessEnabled ||
        shouldSkipAgentSessionWrite() ||
        localBridgeHandle !== bridge
      ) {
        return;
      }
      await writeAgentSessionDescriptor(agentSessionPath, descriptor);
    });
  await agentSessionWriteChain;
};

const setCurrentProject = async (
  nextProject: LocalBridgeCurrentProject | null,
) => {
  currentProject = nextProject;
  try {
    if (!agentAccessEnabled) {
      await stopLocalBridge();
    } else {
      await startLocalBridge();
    }
  } catch (error) {
    console.error("[agent:bridge-sync-failed]", error);
  }
  try {
    await writeCurrentAgentSessionDescriptor();
  } catch (error) {
    console.error("[agent:session-write-failed]", error);
  }
};

const createMainRendererCommandBridge = () =>
  createRendererCommandBridge({
    send: (channel, request) => {
      const targetWindow = getTargetWindow();
      if (!targetWindow || targetWindow.webContents.isDestroyed()) {
        throw new Error("CoreStudio renderer is not ready");
      }
      targetWindow.webContents.send(channel, request);
    },
    onResponse: (listener) => {
      const handler = (
        _event: IpcMainEvent,
        response: AgentRendererCommandResponse,
      ) => {
        listener(response);
      };
      ipcMain.on(IPC_CHANNELS.agentCommandResponse, handler);
      return () => {
        ipcMain.removeListener(IPC_CHANNELS.agentCommandResponse, handler);
      };
    },
    isAvailable: () => {
      const targetWindow = getTargetWindow();
      return Boolean(
        rendererReady &&
          targetWindow &&
          !targetWindow.webContents.isDestroyed(),
      );
    },
  });

const startLocalBridge = async () => {
  if (localBridgeHandle) {
    return;
  }

  rendererCommandBridge = createMainRendererCommandBridge();
  let bridge: LocalBridgeServerHandle | null = null;
  try {
    bridge = await createLocalBridgeServer({
      preferredPort: AGENT_BRIDGE_PREFERRED_PORT,
      agentBoardAssetsDir: rendererUrl
        ? undefined
        : path.join(__dirname, "..", "dist"),
      isAgentAccessEnabled: () => agentAccessEnabled,
      getCurrentProject,
      getProjectByToken: getAgentProjectByToken,
      getBoardUrl: getAgentBoardUrl,
      renderer: {
        request: (command: AgentRendererCommandName, payload?: unknown) => {
          if (!rendererCommandBridge) {
            return Promise.reject(
              new Error("CoreStudio renderer command bridge is not ready"),
            );
          }
          return rendererCommandBridge.request(command, payload, {
            timeoutMs: getAgentRendererCommandTimeoutMs(command, payload),
          });
        },
      },
      grants: taskGrantStore,
      participantIssuerToken,
      issueProjectRoomTicket: async ({ project, threadId, displayLabel }) => {
        const room = await projectRoomService.openProject(project.projectPath);
        return {
          launchTicket: projectRoomTicketStore.issueLaunchTicket({
            identity: room.identity,
            actorId: `codex:${threadId}`,
            displayLabel,
          }),
        };
      },
      authenticateProjectRoomWebSocket: async (input) => {
        const identity = projectRoomTicketStore.getGrantedIdentity(input);
        const room = projectRoomService.manager.get(identity.projectId);
        if (!room) {
          throw new ProjectRoomError(
            "ROOM_CLOSED",
            "The project room is no longer active.",
          );
        }
        const exchange = input.launchTicket
          ? projectRoomTicketStore.consumeLaunchTicket(
              input.launchTicket,
              room.identity,
            )
          : projectRoomTicketStore.resume(
              input.resumeToken ?? "",
              room.identity,
            );
        const bundle = await readProjectBundle(
          room.identity.canonicalProjectPath,
        );
        return {
          room,
          exchange,
          bootstrap: {
            projectPath: room.identity.canonicalProjectPath,
            project: bundle.project,
            imageRecords: bundle.imageRecords,
          },
        };
      },
      readProjectRoomAssets: async ({ resumeToken, fileIds, rendition }) => {
        const grantedIdentity = projectRoomTicketStore.getGrantedIdentity({
          launchTicket: null,
          resumeToken,
        });
        const room = projectRoomService.manager.get(grantedIdentity.projectId);
        if (!room) {
          throw new ProjectRoomError(
            "ROOM_CLOSED",
            "The project room is no longer active.",
          );
        }
        projectRoomTicketStore.authorizeResumeToken(resumeToken, room.identity);
        const payloads = await readProjectAssetPayloads({
          projectPath: room.identity.canonicalProjectPath,
          fileIds,
          rendition,
        });
        return payloads.filter(
          (payload): payload is NonNullable<typeof payloads[number]> =>
            payload !== null,
        );
      },
      getProjectRoomStatus: async (projectPath) => {
        const room = await projectRoomService.findOpenRoom(projectPath);
        if (!room) {
          return null;
        }
        const snapshot = room.getSnapshot();
        return {
          sceneWriteMode: "room",
          roomId: room.identity.roomId,
          sessionEpoch: room.identity.sessionEpoch,
          roomSequence: snapshot.sequence,
          persistedSequence: snapshot.persistedSequence,
          lifecycle: room.lifecycle,
        };
      },
      readProjectRoomScene: async ({ project, command }) => {
        const room = await projectRoomService.openProject(project.projectPath);
        const snapshot = room.getSnapshot();
        const bundle = await readProjectBundle(
          room.identity.canonicalProjectPath,
        );
        const projectBundle = {
          ...bundle,
          projectPath: room.identity.canonicalProjectPath,
        };

        if (command === "scene.board") {
          const assetPayloads = await readProjectAssetPayloads({
            projectPath: room.identity.canonicalProjectPath,
            fileIds: collectProjectRoomAgentImageFileIds(snapshot),
            rendition: "preview",
          });
          return readProjectRoomAgentScene({
            command,
            project: projectBundle,
            snapshot,
            assetPayloads: assetPayloads.filter(
              (payload): payload is NonNullable<typeof assetPayloads[number]> =>
                payload !== null,
            ),
          });
        }

        return readProjectRoomAgentScene({
          command,
          project: projectBundle,
          snapshot,
        });
      },
      persistProjectRoomAssets: async ({ resumeToken, files }) => {
        const grantedIdentity = projectRoomTicketStore.getGrantedIdentity({
          launchTicket: null,
          resumeToken,
        });
        const room = projectRoomService.manager.get(grantedIdentity.projectId);
        if (!room) {
          throw new ProjectRoomError(
            "ROOM_CLOSED",
            "The project room is no longer active.",
          );
        }
        projectRoomTicketStore.authorizeResumeToken(resumeToken, room.identity);
        return persistImageAssets({
          projectPath: room.identity.canonicalProjectPath,
          files,
        });
      },
      withAgentWriterCommand: async (
        { project, threadId, displayLabel },
        run,
      ) => {
        const room = await projectRoomService.openProject(project.projectPath);
        const sessionId = randomUUID();
        room.join({
          actorId: `codex:${threadId}`,
          sessionId,
          transport: "command",
          role: "agent-writer",
          displayLabel,
        });
        try {
          return await run({
            sessionId,
            identity: room.identity,
          });
        } finally {
          room.leave(sessionId);
        }
      },
      getProjectRoomParticipantState: async ({ project, threadId }) => {
        const room = await projectRoomService.findOpenRoom(project.projectPath);
        return (
          room?.getParticipantSelectionByActor(`codex:${threadId}`) ?? null
        );
      },
    });
    localBridgeHandle = bridge;
    await writeCurrentAgentSessionDescriptor();
    if (localBridgeHandle === bridge && !shouldSkipAgentSessionWrite()) {
      console.log("[agent:bridge-started]", bridge.baseUrl);
    }
  } catch (error) {
    rendererCommandBridge?.dispose();
    rendererCommandBridge = null;
    if (localBridgeHandle === bridge) {
      localBridgeHandle = null;
    }
    if (bridge && localBridgeHandle !== bridge) {
      await bridge.close().catch((closeError) => {
        console.error("[agent:bridge-close-after-start-failed]", closeError);
      });
    }
    throw error;
  }
};

const stopLocalBridge = async ({ final = false } = {}) => {
  if (final) {
    localBridgeCleanupStarted = true;
  }
  const bridge = localBridgeHandle;
  localBridgeHandle = null;

  rendererCommandBridge?.dispose();
  rendererCommandBridge = null;

  await agentSessionWriteChain.catch((error) => {
    console.error("[agent:session-write-failed]", error);
  });

  const cleanupOperations: Promise<void>[] = [
    removeAgentSessionDescriptor(agentSessionPath),
  ];
  if (bridge) {
    cleanupOperations.push(bridge.close());
  }

  await Promise.all(
    cleanupOperations.map((operation) =>
      operation.catch((error) => {
        console.error("[agent:bridge-cleanup-failed]", error);
      }),
    ),
  );
};

const setAgentBridgeEnabled = async (enabled: boolean) => {
  if (agentAccessEnabled === enabled && (!enabled || localBridgeHandle)) {
    return getAgentBridgeStatus();
  }

  const previousEnabled = agentAccessEnabled;
  const settings = await saveAgentAccessSettings({ enabled });
  agentAccessEnabled = settings.enabled;

  if (!enabled) {
    await stopLocalBridge();
    Menu.setApplicationMenu(buildMenu());
    return getAgentBridgeStatus();
  }

  try {
    await startLocalBridge();
  } catch (error) {
    agentAccessEnabled = previousEnabled;
    await saveAgentAccessSettings({ enabled: previousEnabled }).catch(
      (persistError) => {
        console.error("[agent:bridge-enable-rollback-failed]", persistError);
      },
    );
    Menu.setApplicationMenu(buildMenu());
    throw error;
  }

  Menu.setApplicationMenu(buildMenu());
  return getAgentBridgeStatus();
};

const sendMenuAction = (
  event: DesktopMenuEvent,
  ownerWindow?: BaseWindow | null,
) => {
  if (
    event.action === "new-project" ||
    event.action === "open-project" ||
    event.action === "open-project-safe" ||
    event.action === "open-recent-project"
  ) {
    void handleProjectMenuAction(event, ownerWindow);
    return;
  }

  sendRendererMenuEvent(event, ownerWindow);
};

const buildProjectBundle = async (
  projectPath: string,
  options: { safeMode?: boolean } = {},
) => {
  const bundle = await readProjectBundle(projectPath);
  currentRecentProjects = await rememberRecentProject(
    projectPath,
    bundle.project.name,
  );
  Menu.setApplicationMenu(buildMenu());
  return {
    projectPath,
    safeMode: options.safeMode || undefined,
    ...bundle,
  };
};

const sendProjectBundleToRenderer = (
  projectBundle: DesktopProjectBundle,
  openRequestId: number,
  ownerWindow?: BaseWindow | null,
) => {
  sendRendererMenuEvent(
    {
      action: "project-opened",
      openRequestId,
      projectBundle,
    },
    ownerWindow,
  );
};

const sendProjectOpenErrorToRenderer = (
  error: unknown,
  openRequestId: number,
  ownerWindow?: BaseWindow | null,
) => {
  const rawErrorMessage = getErrorMessage(error);
  const errorMessage =
    unmarkMissingRecentProjectMessage(rawErrorMessage) ?? rawErrorMessage;
  console.error("[project:open-failed]", error);
  sendRendererMenuEvent(
    {
      action: "project-open-failed",
      openRequestId,
      errorMessage,
    },
    ownerWindow,
  );
};

const openRecentProjectBundle = async (projectPath: string) => {
  try {
    return await buildProjectBundle(projectPath);
  } catch (error) {
    if (isMissingProjectFileError(error)) {
      currentRecentProjects = await removeRecentProject(projectPath);
      Menu.setApplicationMenu(buildMenu());
      throw new Error(
        markMissingRecentProjectMessage(
          buildMissingRecentProjectMessage(projectPath),
        ),
      );
    }
    throw error;
  }
};

const requestRendererProjectRoomFlush = (
  targetWindow: BrowserWindow,
  timeoutMs = 5000,
) =>
  new Promise<void>((resolve, reject) => {
    if (targetWindow.isDestroyed() || targetWindow.webContents.isDestroyed()) {
      reject(new Error("窗口已经关闭，无法完成项目保存。"));
      return;
    }

    const requestId = ++latestProjectRoomFlushRequestId;
    const timeout = setTimeout(() => {
      pendingProjectRoomFlushes.delete(requestId);
      reject(new Error("等待项目保存超时。"));
    }, timeoutMs);

    pendingProjectRoomFlushes.set(requestId, {
      resolve: () => {
        clearTimeout(timeout);
        resolve();
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
      timeout,
    });

    targetWindow.webContents.send(IPC_CHANNELS.flushProjectRoomRequest, {
      requestId,
    });
  });

const showCloseAfterSaveFailedDialog = async (
  targetWindow: BrowserWindow,
  error: unknown,
) => {
  const result = await dialog.showMessageBox(targetWindow, {
    type: "warning",
    buttons: ["继续关闭", "取消"],
    defaultId: 1,
    cancelId: 1,
    message: "项目保存失败",
    detail: `${getErrorMessage(
      error,
    )}\n\n建议先取消关闭，确认项目保存后再退出。`,
  });

  return result.response === 0;
};

const confirmDisconnectProjectParticipants = async (
  targetWindow: BrowserWindow,
  participants: Array<{ displayLabel: string }>,
) => {
  const result = await dialog.showMessageBox(targetWindow, {
    type: "warning",
    buttons: ["关闭项目", "取消"],
    defaultId: 1,
    cancelId: 1,
    message: "仍有 Agent 正在这个画布中工作",
    detail: `关闭项目后，以下协作会立即断开：\n${participants
      .map((participant) => `• ${participant.displayLabel}`)
      .join("\n")}`,
  });
  return result.response === 0;
};

const closeWindowAfterProjectRoomFlush = async (
  targetWindow: BrowserWindow,
) => {
  const activeProjectPath = currentProject?.projectPath;
  if (activeProjectPath) {
    const closeState = await projectRoomService
      .getCloseState(activeProjectPath)
      .catch(() => null);
    const collaborators = selectProjectRoomAgentPresence(
      closeState?.otherParticipants ?? [],
    );
    if (
      collaborators.length > 0 &&
      !(await confirmDisconnectProjectParticipants(targetWindow, collaborators))
    ) {
      quitState.clearQuitRequest();
      return;
    }
    if (closeState) {
      const room = await projectRoomService.findOpenRoom(activeProjectPath);
      try {
        await requestRendererProjectRoomFlush(targetWindow);
        await projectRoomService.closeProjectPath(activeProjectPath, {
          expectedRoomId: closeState.roomId,
          acknowledgedParticipantSessionIds: closeState.otherParticipants.map(
            (participant) => participant.sessionId,
          ),
        });
        if (room) {
          projectRoomTicketStore.revokeRoom(room.identity);
        }
        allowWindowClose = true;
        targetWindow.close();
        return;
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "PARTICIPANTS_CHANGED"
        ) {
          return closeWindowAfterProjectRoomFlush(targetWindow);
        }
        console.error("[project-room:close-persist-failed]", error);
        const shouldForceClose = await showCloseAfterSaveFailedDialog(
          targetWindow,
          error,
        );
        if (shouldForceClose) {
          await projectRoomService.closeProjectPath(activeProjectPath, {
            force: true,
          });
          if (room) {
            projectRoomTicketStore.revokeRoom(room.identity);
          }
          allowWindowClose = true;
          targetWindow.close();
        } else {
          quitState.clearQuitRequest();
        }
        return;
      }
    }
  }
  try {
    await requestRendererProjectRoomFlush(targetWindow);
    allowWindowClose = true;
    targetWindow.close();
  } catch (error) {
    console.error("[project:flush-before-close-failed]", error);
    const shouldClose = await showCloseAfterSaveFailedDialog(
      targetWindow,
      error,
    );
    if (shouldClose) {
      allowWindowClose = true;
      targetWindow.close();
    } else {
      quitState.clearQuitRequest();
    }
  }
};

const handleProjectMenuAction = async (
  event: DesktopMenuEvent,
  ownerWindow?: BaseWindow | null,
) => {
  const openRequestId = ++latestProjectOpenRequestId;
  const sendLatestProjectBundle = (projectBundle: DesktopProjectBundle) => {
    if (openRequestId !== latestProjectOpenRequestId) {
      return;
    }
    sendProjectBundleToRenderer(projectBundle, openRequestId, ownerWindow);
  };

  try {
    if (event.action === "new-project") {
      const selectedPath = await chooseCreateProjectDirectory(
        getTargetWindow(ownerWindow),
      );
      if (!selectedPath) {
        return;
      }
      const { projectPath } = await createProjectStructure(
        path.dirname(selectedPath),
        path.basename(selectedPath),
      );
      sendLatestProjectBundle(await buildProjectBundle(projectPath));
      return;
    }

    if (
      event.action === "open-project" ||
      event.action === "open-project-safe"
    ) {
      const selectedPath = await chooseOpenProjectDirectory(
        getTargetWindow(ownerWindow),
      );
      if (!selectedPath) {
        return;
      }
      sendLatestProjectBundle(
        await buildProjectBundle(selectedPath, {
          safeMode: event.action === "open-project-safe",
        }),
      );
      return;
    }

    if (event.action === "open-recent-project" && event.projectPath) {
      sendLatestProjectBundle(await openRecentProjectBundle(event.projectPath));
    }
  } catch (error) {
    if (openRequestId === latestProjectOpenRequestId) {
      sendProjectOpenErrorToRenderer(error, openRequestId, ownerWindow);
    }
  }
};

const registerIpcHandlers = () => {
  ipcMain.on(IPC_CHANNELS.rendererReady, (event) => {
    rendererReady = true;
    const targetWindow =
      BrowserWindow.fromWebContents(event.sender) ?? getTargetWindow();
    if (!targetWindow || targetWindow.webContents.isDestroyed()) {
      pendingRendererMenuEvents.length = 0;
      return;
    }

    const pendingEvents = pendingRendererMenuEvents.splice(0);
    for (const pendingEvent of pendingEvents) {
      targetWindow.webContents.send(IPC_CHANNELS.menuAction, pendingEvent);
    }
  });

  ipcMain.on(
    IPC_CHANNELS.projectStateChanged,
    (_event, payload: DesktopProjectStateChangedPayload) => {
      void setCurrentProject(payload.currentProject);
    },
  );

  ipcMain.handle(IPC_CHANNELS.getAgentBridgeStatus, async () =>
    getAgentBridgeStatus(),
  );

  ipcMain.handle(
    IPC_CHANNELS.setAgentBridgeEnabled,
    async (_event, enabled: unknown) => {
      if (typeof enabled !== "boolean") {
        throw new Error("Agent Bridge enabled state must be a boolean.");
      }

      return setAgentBridgeEnabled(enabled);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.projectRoomJoin,
    async (event, input: DesktopProjectRoomJoinInput) => {
      const sender = event.sender;
      return projectRoomIpcController.join(input, (roomEvent) => {
        if (sender.isDestroyed()) {
          return;
        }
        const envelope: DesktopProjectRoomEventEnvelope = {
          sessionId: input.sessionId,
          event: roomEvent,
        };
        sender.send(IPC_CHANNELS.projectRoomEvent, envelope);
      });
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomOperation,
    async (
      _event,
      input: {
        sessionId: string;
        operation: ProjectRoomSceneOperation;
      },
    ) =>
      projectRoomIpcController.applySceneOperation(
        input.sessionId,
        input.operation,
      ),
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomAgentWriterOperation,
    async (
      _event,
      input: {
        sessionId: string;
        operation: ProjectRoomSceneOperation;
      },
    ) => {
      const room = projectRoomService.manager.get(input.operation.projectId);
      if (!room) {
        throw new ProjectRoomError(
          "ROOM_CLOSED",
          "The project room is no longer active.",
        );
      }
      return room.applyAgentCommandOperation(input.sessionId, input.operation);
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomLeave,
    async (_event, sessionId: string) =>
      projectRoomIpcController.leave(sessionId),
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomCloseState,
    async (_event, input: { projectPath: string; sessionId: string }) => {
      const state = await projectRoomService.getCloseState(
        input.projectPath,
        input.sessionId,
      );
      return state
        ? {
            roomId: state.roomId,
            otherParticipants: state.otherParticipants,
          }
        : null;
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomClose,
    async (
      _event,
      input: {
        projectPath: string;
        force?: boolean;
        expectedRoomId?: string;
        requestingSessionId?: string;
        acknowledgedParticipantSessionIds?: string[];
      },
    ) => {
      const room = await projectRoomService.findOpenRoom(input.projectPath);
      const closed = await projectRoomService.closeProjectPath(
        input.projectPath,
        {
          force: input.force,
          expectedRoomId: input.expectedRoomId,
          requestingSessionId: input.requestingSessionId,
          acknowledgedParticipantSessionIds:
            input.acknowledgedParticipantSessionIds,
        },
      );
      if (closed && room) {
        projectRoomTicketStore.revokeRoom(room.identity);
      }
      return closed;
    },
  );

  ipcMain.on(
    IPC_CHANNELS.flushProjectRoomResponse,
    (_event, response: DesktopProjectRoomFlushResponse) => {
      const pendingFlush = pendingProjectRoomFlushes.get(response.requestId);
      if (!pendingFlush) {
        return;
      }

      pendingProjectRoomFlushes.delete(response.requestId);
      if (response.ok) {
        pendingFlush.resolve();
        return;
      }

      pendingFlush.reject(new Error(response.errorMessage || "项目保存失败。"));
    },
  );

  ipcMain.handle(IPC_CHANNELS.createProject, async () => {
    const selectedPath = await chooseCreateProjectDirectory(mainWindow);
    if (!selectedPath) {
      return null;
    }
    const { projectPath } = await createProjectStructure(
      path.dirname(selectedPath),
      path.basename(selectedPath),
    );
    return buildProjectBundle(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.openProject, async () => {
    const selectedPath = await chooseOpenProjectDirectory(mainWindow);
    if (!selectedPath) {
      return null;
    }
    return buildProjectBundle(selectedPath);
  });

  ipcMain.handle(
    IPC_CHANNELS.openRecentProject,
    async (_event, projectPath: string) => {
      return openRecentProjectBundle(projectPath);
    },
  );

  ipcMain.handle(IPC_CHANNELS.loadRecentProjects, async () => {
    return loadRecentProjects();
  });

  ipcMain.handle(
    IPC_CHANNELS.removeRecentProject,
    async (_event, projectPath: string) => {
      currentRecentProjects = await removeRecentProject(projectPath);
      Menu.setApplicationMenu(buildMenu());
      return currentRecentProjects;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.readProjectAssetPayloads,
    async (_event, input) => {
      return readProjectAssetPayloads(input);
    },
  );

  ipcMain.handle(IPC_CHANNELS.inspectProjectHealth, async (_event, input) => {
    return inspectProjectHealth(input);
  });

  ipcMain.handle(
    IPC_CHANNELS.rebuildProjectThumbnails,
    async (_event, input) => {
      const activeRoom = await projectRoomService.findOpenRoom(
        input.projectPath,
      );
      if (activeRoom) {
        await activeRoom.flushPersistence();
      }
      return rebuildProjectThumbnails(input, {
        writeProjectScene: (sceneInput) =>
          projectRoomService.writeMaintenanceScene(sceneInput),
      });
    },
  );

  ipcMain.handle(IPC_CHANNELS.cleanProjectCache, async (_event, input) => {
    return cleanProjectCache(input);
  });

  ipcMain.handle(IPC_CHANNELS.persistImageAssets, async (_event, input) => {
    return persistImageAssets(input);
  });

  ipcMain.handle(IPC_CHANNELS.beginImageWriteback, async (_event, input) => {
    return beginProjectImageWriteback(input);
  });

  ipcMain.handle(IPC_CHANNELS.commitImageWriteback, async (_event, input) => {
    return commitProjectImageWriteback(input);
  });

  ipcMain.handle(IPC_CHANNELS.rollbackImageWriteback, async (_event, input) => {
    return rollbackProjectImageWriteback(input);
  });

  ipcMain.handle(IPC_CHANNELS.importImages, async () => importImagesFromDisk());

  ipcMain.handle(
    IPC_CHANNELS.revealProjectInFinder,
    async (_event, projectPath: string) => {
      shell.showItemInFolder(path.join(projectPath, PROJECT_FILENAMES.project));
    },
  );

  ipcMain.handle(IPC_CHANNELS.loadAppInfo, async () => ({
    name: DESKTOP_APP_NAME,
    version: DESKTOP_APP_VERSION,
  }));

  ipcMain.handle(IPC_CHANNELS.openExternal, async (_event, value: unknown) => {
    if (typeof value !== "string") {
      throw new Error("External URL must be a string.");
    }

    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error("Only HTTPS external URLs are allowed.");
    }

    await shell.openExternal(url.toString());
  });

  ipcMain.handle(IPC_CHANNELS.inspectCodexIntegration, async () =>
    inspectCodexIntegration({
      homeDir: app.getPath("home"),
      resourcesPath: process.resourcesPath,
      appVersion: DESKTOP_APP_VERSION,
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.installCodexIntegration,
    async (_event, ...args) => {
      if (args.length > 0) {
        throw new Error(
          "Codex integration installer does not accept arguments.",
        );
      }
      return installCodexIntegration({
        resourcesPath: process.resourcesPath,
      });
    },
  );

  ipcMain.handle(IPC_CHANNELS.loadProviderSettings, async () =>
    loadProviderSettings(),
  );

  ipcMain.handle(
    IPC_CHANNELS.saveProviderSettings,
    async (_event, input: SaveProviderSettingsInput) =>
      saveProviderSettings(input),
  );

  ipcMain.handle(
    IPC_CHANNELS.deleteProviderSettings,
    async (_event, input: DeleteProviderSettingsInput) =>
      deleteProviderSettings(input),
  );
  ipcMain.handle(
    IPC_CHANNELS.generateImages,
    async (_event, input: GenerateImagesInput) =>
      generationRequestController.generate(input),
  );

  ipcMain.handle(
    IPC_CHANNELS.cancelGenerateImages,
    async (_event, generationJobId: string) => {
      generationRequestController.cancel(generationJobId);
    },
  );

  ipcMain.handle(IPC_CHANNELS.readClipboardImage, async () =>
    readClipboardImageFromSystem(),
  );
  ipcMain.handle(IPC_CHANNELS.loadLocaleSettings, async () =>
    localeSettingsController?.getSettings(),
  );
  ipcMain.handle(
    IPC_CHANNELS.saveLocalePreference,
    async (_event, preference: DesktopLocalePreference) => {
      if (!localeSettingsController) {
        throw new Error("Locale settings are not ready.");
      }
      return localeSettingsController.savePreference(preference);
    },
  );
};

const buildMenu = () =>
  Menu.buildFromTemplate(
    createAppMenuTemplate(
      sendMenuAction,
      currentRecentProjects,
      DESKTOP_APP_VERSION,
      (url) => {
        void shell.openExternal(url);
      },
      {
        platform: process.platform,
        locale: DESKTOP_LANG_CODE,
      },
    ),
  );

const createWindow = async () => {
  allowWindowClose = false;
  rendererReady = false;
  pendingRendererMenuEvents.length = 0;
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#f5f3ef",
    title: DESKTOP_APP_NAME,
    ...(process.platform === "darwin"
      ? {
          titleBarStyle: "hiddenInset" as const,
        }
      : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  configureRendererPermissions(mainWindow);
  disableRendererPageZoom(mainWindow);

  mainWindow.on("close", (event) => {
    const targetWindow = mainWindow;
    if (!targetWindow || allowWindowClose) {
      return;
    }

    event.preventDefault();
    void closeWindowAfterProjectRoomFlush(targetWindow);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    rendererReady = false;
    void setCurrentProject(null);
  });

  Menu.setApplicationMenu(buildMenu());

  mainWindow.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      console.log(
        `[renderer:${level}] ${message}${
          sourceId ? ` (${sourceId}:${line})` : ""
        }`,
      );
    },
  );
  mainWindow.webContents.on("did-start-loading", () => {
    rendererReady = false;
  });
  mainWindow.webContents.on("did-finish-load", () => {
    if (process.env.CORESTUDIO_SMOKE_TEST === "1") {
      console.log(PACKAGED_SMOKE_READY_SIGNAL);
      allowWindowClose = true;
      app.quit();
    }
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("[renderer:gone]", details);
  });
  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error("[renderer:load-failed]", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    },
  );
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("[renderer:preload-error]", {
      preloadPath,
      error,
    });
  });

  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl);
    if (shouldOpenDevTools()) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
};

const importImagesFromDisk = async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "webp", "svg"],
      },
    ],
  });

  if (result.canceled) {
    return [];
  }

  return Promise.all(
    result.filePaths.map(async (filePath) => {
      const fileBuffer = await fs.readFile(filePath);
      const image = nativeImage.createFromBuffer(fileBuffer);
      const size = image.getSize();
      const extension = path.extname(filePath).toLowerCase();
      const mimeType =
        extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : extension === ".webp"
          ? "image/webp"
          : extension === ".svg"
          ? "image/svg+xml"
          : "image/png";

      return {
        fileName: path.basename(filePath),
        fileId: randomUUID(),
        mimeType,
        dataBase64: fileBuffer.toString("base64"),
        width: size.width || 1024,
        height: size.height || 1024,
        createdAt: new Date().toISOString(),
      };
    }),
  );
};

const readClipboardImageFromSystem = () => {
  const image = clipboard.readImage();
  if (image.isEmpty()) {
    return null;
  }

  const imageBuffer = image.toPNG();
  const size = image.getSize();
  if (!imageBuffer.length || !size.width || !size.height) {
    return null;
  }

  return {
    fileName: "clipboard.png",
    fileId: randomUUID(),
    mimeType: "image/png",
    dataBase64: imageBuffer.toString("base64"),
    width: size.width,
    height: size.height,
    createdAt: new Date().toISOString(),
  };
};

if (hasSingleInstanceLock) {
  app.whenReady().then(async () => {
    localeSettingsController = createLocaleSettingsController({
      store: createLocaleSettingsStore({
        settingsPath: path.join(
          app.getPath("userData"),
          "locale-settings.json",
        ),
        getSystemLocales: () => app.getPreferredSystemLanguages(),
      }),
      onLocaleChanged: (locale) => {
        setActiveDesktopLocale(locale);
        if (mainWindow && !mainWindow.isDestroyed()) {
          Menu.setApplicationMenu(buildMenu());
        }
      },
    });
    await localeSettingsController.initialize();
    agentAccessEnabled = (await loadAgentAccessSettings()).enabled;
    currentRecentProjects = await loadRecentProjects();
    await removeAgentSessionDescriptor(agentSessionPath).catch((error) => {
      console.error("[agent:session-cleanup-failed]", error);
    });
    registerIpcHandlers();
    await createWindow();
    if (agentAccessEnabled) {
      await startLocalBridge().catch((error) => {
        console.error("[agent:bridge-startup-failed]", error);
      });
    }

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
        if (agentAccessEnabled) {
          await startLocalBridge().catch((error) => {
            console.error("[agent:bridge-startup-failed]", error);
          });
        }
      }
    });
  });
}

app.on("before-quit", () => {
  quitState.markQuitRequested();
});

app.on("will-quit", (event) => {
  if (localBridgeCleanupFinished) {
    return;
  }

  event.preventDefault();
  if (localBridgeCleanupStarted) {
    return;
  }

  void stopLocalBridge({ final: true }).finally(() => {
    localBridgeCleanupFinished = true;
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (quitState.shouldQuitWhenAllWindowsClosed(process.platform)) {
    app.quit();
  }
});
