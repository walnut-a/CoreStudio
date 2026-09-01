import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import path from "path";
import type { BaseWindow, IpcMainEvent, WebContents } from "electron";

import {
  BrowserWindow,
  Menu,
  WebContentsView,
  app,
  clipboard,
  dialog,
  ipcMain,
  nativeImage,
  shell,
  webContents,
} from "electron";

import {
  IPC_CHANNELS,
  type DesktopProjectRoomFlushResponse,
  type DesktopMenuEvent,
  type DesktopAgentBridgeStatus,
  type DesktopProjectStateChangedPayload,
  type DesktopProjectViewsState,
  type DesktopProjectViewOpenOptions,
  type DesktopProjectBundle,
  type RecentProjectEntry,
  type DeleteProviderSettingsInput,
  type GenerateImagesInput,
  type SaveProviderSettingsInput,
} from "../src/shared/desktopBridgeTypes";
import {
  buildDesktopProjectRendererUrl,
  buildDesktopShellRendererUrl,
} from "../src/shared/desktopRendererRoute";
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
  isAgentHost,
  type AgentRendererCommandName,
  type AgentRendererCommandResponse,
} from "../src/shared/agentBridgeTypes";
import { AGENT_INTEGRATION_VERSION } from "../src/shared/agentIntegrationContract";
import { PROJECT_FILENAMES } from "../src/shared/projectTypes";
import {
  beginProjectImageWriteback,
  commitProjectImageWriteback,
  rollbackProjectImageWriteback,
} from "./project/projectImageWriteback";
import {
  cleanProjectCache,
  createProjectStructure,
  ensureProjectStableBoardId,
  inspectProjectHealth,
  persistImageAssets,
  readProjectAssetPayloads,
  readProjectBundle,
  readProjectManifestSnapshot,
  rebuildProjectThumbnails,
  writeProjectScene,
} from "./projectFs";
import {
  chooseCreateProjectDirectory,
  chooseOpenProjectDirectory,
} from "./projectDialogs";
import { generateImages } from "./providers";
import { createGenerationRequestController } from "./generationRequestController";
import { resolveDesktopEditShortcut } from "./desktopEditShortcut";
import { createDesktopEditContextController } from "./desktopEditContext";
import {
  deleteProviderSettings,
  loadProviderSettings,
  migrateProviderDefaultModels,
  saveProviderSettings,
  setGenerateComposerVisible,
} from "./settingsStore";
import { createModelCatalogService } from "./modelCatalogService";
import {
  loadAgentAccessSettings,
  saveAgentAccessSettings,
} from "./agent/agentAccessStore";
import { createAgentImageGenerationService } from "./agent/agentImageGenerationService";
import { createLocalAgentSessionStore } from "./agent/localAgentSessionStore";
import { buildAgentBoardUrl } from "./agent/agentBoardUrl";
import { createBoardProjectSelectionStore } from "./agent/boardProjectSelectionStore";
import { buildBoardProjectCandidates } from "./agent/boardProjectCandidates";
import {
  loadRecentProjects,
  rememberRecentProject,
  removeRecentProject,
} from "./recentProjectsStore";
import { DESKTOP_LANG_CODE, setActiveDesktopLocale } from "../src/app/copy";
import { selectProjectRoomAgentPresence } from "../src/app/projectRoomPresence";
import { DESKTOP_APP_VERSION } from "./appVersion";
import { createAppMenuTemplate } from "./menu";
import {
  createMainProcessErrorReporter,
  installMainProcessErrorHandlers,
} from "./mainProcessErrors";
import { shouldOpenDevTools } from "./devtools";
import { createQuitState } from "./windowLifecycle";
import { createLauncherLivenessGuard } from "./launcherLiveness";
import { disableRendererPageZoom } from "./windowZoomGuard";
import {
  inspectAgentIntegration,
  installAgentIntegration,
  removeAgentIntegration,
} from "./agentIntegrationService";
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
import { createTaskGrantStore } from "./agent/taskGrants";
import { createRendererCommandBridge } from "./agent/rendererCommandBridge";
import { configureNoSystemKeychainAccess } from "./keychainGuard";
import { installBrokenPipeConsoleGuard } from "./safeProcessLogging";
import { createLocaleSettingsStore } from "./localeSettingsStore";
import { createLocaleSettingsController } from "./localeSettingsController";
import { createCanvasInteractionSettingsStore } from "./canvasInteractionSettingsStore";
import { createCanvasInteractionSettingsController } from "./canvasInteractionSettingsController";
import { createAppUpdateService } from "./appUpdateService";
import type {
  DesktopCanvasInteractionSettings,
  TrackpadZoomSpeed,
} from "../src/shared/canvasInteractionSettings";
import type { DesktopAppUpdateAvailability } from "../src/shared/appUpdate";
import { createProjectRoomService } from "./room/projectRoomService";
import { createProjectProcessLeaseRegistry } from "./room/projectProcessLease";
import { executeProjectRoomAgentWriterCommand } from "./room/projectRoomAgentWriter";
import { createProjectRoomIpcController } from "./room/projectRoomIpcController";
import { createProjectRoomTicketStore } from "./room/projectRoomTicketStore";
import { createStableBoardSessionClaimStore } from "./room/stableBoardSessionClaimStore";
import {
  createStableBoardActorResumeTokenService,
  loadOrCreateStableBoardActorTokenSecret,
  type StableBoardActorResumeTokenService,
} from "./room/stableBoardActorResumeToken";
import { ProjectRoomError, type ProjectRoom } from "./room/projectRoom";
import {
  collectProjectRoomAgentImageFileIds,
  readProjectRoomAgentScene,
} from "./room/projectRoomAgentRead";
import {
  createProjectRendererPartition,
  createProjectViewRegistry,
  type ProjectViewRegistry,
} from "./projectViewRegistry";
import { createProjectViewHandleLifecycle } from "./projectViewHandleLifecycle";
import { createProjectRendererLifecycle } from "./projectRendererLifecycle";
import { writeProjectElementsToClipboard } from "./projectClipboard";
import {
  createProjectRoomSenderBindings,
  type ProjectRoomSenderBindings,
} from "./room/projectRoomSenderBindings";
import {
  buildDesktopStartupIdentity,
  removeDesktopStartupIdentity,
  resolveDesktopInstanceKind,
  resolveDesktopRendererIdentityUrl,
  resolveDesktopWindowTitle,
  resolveMainProcessGroupId,
  writeDesktopStartupIdentity,
} from "./desktopStartupIdentity";
import { createActiveProjectDescriptorSync } from "./activeProjectDescriptorSync";
import { resolveDesktopMenuEventTarget } from "./desktopMenuEventRouting";
import {
  resolveDesktopAppName,
  resolveDesktopRuntimeConfig,
  shouldDefaultAgentAccessEnabled,
} from "./desktopRuntimeConfig";

installBrokenPipeConsoleGuard();

const bundledDesktopAppName = app.getName();
const configuredDesktopAppName = resolveDesktopAppName({
  bundledAppName: bundledDesktopAppName,
});
configureNoSystemKeychainAccess(app.commandLine);
app.setName(configuredDesktopAppName);
const desktopRuntime = resolveDesktopRuntimeConfig({
  bundledAppName: bundledDesktopAppName,
  isPackaged: app.isPackaged,
  userDataPath: app.getPath("userData"),
});
process.env.CORESTUDIO_SETTINGS_DIRECTORY = desktopRuntime.settingsDirectory;

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
let canvasInteractionSettingsController: ReturnType<
  typeof createCanvasInteractionSettingsController
> | null = null;
let modelCatalogService: ReturnType<typeof createModelCatalogService> | null =
  null;
let appUpdateService: ReturnType<typeof createAppUpdateService> | null = null;
let projectViewRegistry: ProjectViewRegistry | null = null;
let projectRoomSenderBindings: ProjectRoomSenderBindings | null = null;
const quitState = createQuitState();
const agentSessionPath = desktopRuntime.sessionPath;
const taskGrantStore = createTaskGrantStore();
const participantIssuerToken = randomUUID();
const localAgentSessionStore = createLocalAgentSessionStore();
const projectRoomTicketStore = createProjectRoomTicketStore();
const stableBoardSessionClaimStore = createStableBoardSessionClaimStore();
let stableBoardActorResumeTokenService: StableBoardActorResumeTokenService | null =
  null;
const boardProjectSelectionStore = createBoardProjectSelectionStore();
const projectProcessLeaseRegistry = createProjectProcessLeaseRegistry({
  appName: desktopRuntime.appName,
  pid: process.pid,
  processNonce: randomUUID(),
});
const projectRoomService = createProjectRoomService({
  readProjectBundle,
  writeProjectScene,
  projectProcessLeaseRegistry,
});
const verifiedProjectRoomAssetFileIds = new WeakMap<ProjectRoom, Set<string>>();
const validateProjectRoomOperationAssets = async (
  room: ProjectRoom,
  operation: ProjectRoomSceneOperation,
) => {
  const referencedFileIds = [
    ...new Set(
      operation.elements.flatMap((element) =>
        element.type === "image" &&
        element.isDeleted !== true &&
        typeof element.fileId === "string"
          ? [element.fileId]
          : [],
      ),
    ),
  ];
  if (referencedFileIds.length === 0) {
    return;
  }
  let verifiedAssetFileIds = verifiedProjectRoomAssetFileIds.get(room);
  if (!verifiedAssetFileIds) {
    const bundle = await readProjectBundle(room.identity.canonicalProjectPath);
    verifiedAssetFileIds = new Set(
      room
        .getSnapshot()
        .scene.elements.flatMap((element) =>
          element.type === "image" &&
          typeof element.fileId === "string" &&
          bundle.imageRecords[element.fileId]
            ? [element.fileId]
            : [],
        ),
    );
    verifiedProjectRoomAssetFileIds.set(room, verifiedAssetFileIds);
  }
  const unknownFileIds = referencedFileIds.filter(
    (fileId) => !verifiedAssetFileIds.has(fileId),
  );
  if (unknownFileIds.length === 0) {
    return;
  }
  const currentBundle = await readProjectBundle(
    room.identity.canonicalProjectPath,
  );
  const missingRecordFileIds = unknownFileIds.filter(
    (fileId) => !currentBundle.imageRecords[fileId],
  );
  if (missingRecordFileIds.length > 0) {
    throw new ProjectRoomError(
      "PERSISTENCE_FAILED",
      "Image assets must be persisted before publishing their canvas elements.",
      { missingFileIds: missingRecordFileIds },
    );
  }
  const payloads = await readProjectAssetPayloads({
    projectPath: room.identity.canonicalProjectPath,
    fileIds: unknownFileIds,
    rendition: "original",
  });
  const missingAssetFileIds = unknownFileIds.filter(
    (_fileId, index) => payloads[index] === null,
  );
  if (missingAssetFileIds.length > 0) {
    throw new ProjectRoomError(
      "PERSISTENCE_FAILED",
      "Image asset files must exist before publishing their canvas elements.",
      { missingFileIds: missingAssetFileIds },
    );
  }
  for (const fileId of unknownFileIds) {
    verifiedAssetFileIds.add(fileId);
  }
};
const projectRoomIpcController = createProjectRoomIpcController({
  openProject: (projectPath) => projectRoomService.openProject(projectPath),
  validateOperationAssets: validateProjectRoomOperationAssets,
});
const persistAndPublishProjectRoomAssets = async (
  input: Parameters<typeof persistImageAssets>[0],
) => {
  const imageRecords = await persistImageAssets(input);
  const room = await projectRoomService.findOpenRoom(input.projectPath);
  if (
    room &&
    (room.lifecycle === "active" || room.lifecycle === "storage-error")
  ) {
    room.publishAssetRecords(imageRecords);
  }
  return imageRecords;
};
const generationRequestController = createGenerationRequestController({
  generateImages,
});
const AGENT_GENERATE_IMAGES_TIMEOUT_MS = 180_000;
const resolveAgentActorId = ({
  actorId,
  threadId,
}: {
  actorId?: string;
  threadId?: string;
}) => {
  if (actorId) {
    return actorId;
  }
  if (threadId) {
    return `codex:${threadId}`;
  }
  throw Object.assign(
    new Error("A trusted Agent participant identity is required."),
    { code: "AUTH_REQUIRED" },
  );
};
const executeAgentImageGenerationWriterCommand = async ({
  projectPath,
  threadId,
  actorId,
  displayLabel,
  command,
  payload,
}: {
  projectPath: string;
  threadId?: string;
  actorId?: string;
  displayLabel?: string;
  command: AgentRendererCommandName;
  payload: Record<string, unknown>;
}) => {
  if ((!actorId && !threadId) || !displayLabel) {
    throw Object.assign(
      new Error("A trusted Agent participant identity is required."),
      { code: "AUTH_REQUIRED" },
    );
  }
  if (!rendererCommandBridge) {
    throw Object.assign(
      new Error("CoreStudio renderer command bridge is not ready."),
      { code: "APP_NOT_READY" },
    );
  }
  const resolvedActorId = resolveAgentActorId({ actorId, threadId });
  const room = await projectRoomService.openProject(projectPath);
  const participantState = room.getParticipantSelectionByActor(resolvedActorId);
  const agentBoardContext = participantState
    ? {
        ...(participantState.selection === undefined
          ? {}
          : { selection: participantState.selection }),
        ...(participantState.scene === undefined
          ? {}
          : { scene: participantState.scene }),
        browserRuntime: {
          source: participantState.source,
          updatedAt: participantState.updatedAt,
          receivedAt: new Date().toISOString(),
        },
      }
    : null;
  return executeProjectRoomAgentWriterCommand({
    room,
    actorId: resolvedActorId,
    displayLabel,
    prepare: (context) =>
      rendererCommandBridge!.request(
        command,
        {
          projectPath,
          ...payload,
          ...(agentBoardContext ? { agentBoardContext } : {}),
          projectRoomAgentWriter: context,
        },
        { timeoutMs: AGENT_GENERATE_IMAGES_TIMEOUT_MS },
      ),
    persistAssets: (preparedFiles) =>
      persistAndPublishProjectRoomAssets({
        projectPath,
        files: preparedFiles,
      }),
    validateOperation: (operation) =>
      validateProjectRoomOperationAssets(room, operation),
  });
};
const agentImageGenerationService = createAgentImageGenerationService({
  loadAgentAccessSettings,
  loadProviderSettings,
  readProjectAssetPayloads,
  generateImages: ({ projectPath, request }) =>
    generationRequestController.generate({
      projectPath,
      generationJobId: randomUUID(),
      request,
    }),
  createPlaceholders: async ({
    projectPath,
    request,
    referenceElementIds,
    threadId,
    actorId,
    displayLabel,
  }) =>
    (await executeAgentImageGenerationWriterCommand({
      projectPath,
      threadId,
      actorId,
      displayLabel,
      command: "scene.addCoreStudioGenerationPlaceholders",
      payload: { request, referenceElementIds },
    })) as unknown as {
      slots: Array<{
        frameId: string;
        labelId: string;
        fitReturnedImageSize: boolean;
      }>;
    },
  markPlaceholdersFailed: async ({
    projectPath,
    slots,
    threadId,
    actorId,
    displayLabel,
  }) => {
    await executeAgentImageGenerationWriterCommand({
      projectPath,
      threadId,
      actorId,
      displayLabel,
      command: "scene.failCoreStudioGenerationPlaceholders",
      payload: { slots },
    });
  },
  writeImages: async ({
    projectPath,
    files,
    referenceElementIds,
    threadId,
    actorId,
    displayLabel,
    slots,
  }) => {
    return (await executeAgentImageGenerationWriterCommand({
      projectPath,
      threadId,
      actorId,
      displayLabel,
      command: "scene.addCoreStudioGeneratedImage",
      payload: {
        sourceType: "generated",
        generationOrigin: "corestudio",
        generationSource: "agent",
        referenceElementIds,
        files,
        slots,
      },
    })) as unknown as {
      operationId: string;
      roomSequence: number;
      persistedSequence: number;
      persisted: boolean;
      elementIds: string[];
      fileIds: string[];
      images: Array<{
        fileId: string;
        elementId: string;
        frameId: string;
      }>;
    };
  },
});
const PACKAGED_SMOKE_READY_SIGNAL = "[corestudio:smoke-ready]";
const pendingRendererMenuEvents: DesktopMenuEvent[] = [];
const pendingProjectRoomFlushes = new Map<
  number,
  {
    expectedSenderId: number;
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

const rendererUrl = process.env.ELECTRON_RENDERER_URL ?? null;
const desktopWindowTitle = resolveDesktopWindowTitle({
  appName: desktopRuntime.appName,
  configuredTitle: process.env.CORESTUDIO_WINDOW_TITLE,
});
const desktopInstanceKind = resolveDesktopInstanceKind({
  runtimeMode: desktopRuntime.mode,
  isPackaged: app.isPackaged,
});
const desktopRuntimeLabel =
  desktopInstanceKind === "source-dev"
    ? "SOURCE DEV"
    : desktopInstanceKind === "packaged-preview"
    ? "PACKAGED PREVIEW"
    : desktopInstanceKind === "production"
    ? "PRODUCTION"
    : desktopInstanceKind === "qa"
    ? "QA"
    : "PACKAGED DEV";
const configuredDebugPort = Number(process.env.CORESTUDIO_DEBUG_PORT);
const desktopIdentityPath =
  process.env.CORESTUDIO_RUNTIME_IDENTITY_FILE?.trim() ||
  path.join(app.getPath("userData"), "runtime-identity.json");
const desktopShellRendererUrl = resolveDesktopRendererIdentityUrl({
  developmentUrl: rendererUrl,
  packagedIndexPath: path.join(__dirname, "..", "dist", "index.html"),
});
const desktopStartupIdentity = buildDesktopStartupIdentity({
  schemaVersion: 1,
  instanceKind: desktopInstanceKind,
  runtimeLabel: desktopRuntimeLabel,
  runtimeMode: desktopRuntime.mode,
  appName: desktopRuntime.appName,
  appPath: app.getAppPath(),
  executable: process.execPath,
  userData: app.getPath("userData"),
  windowTitle: desktopWindowTitle,
  bridgePort: desktopRuntime.bridgePort,
  sessionPath: desktopRuntime.sessionPath,
  settingsDirectory: desktopRuntime.settingsDirectory,
  rendererUrl: desktopShellRendererUrl,
  debugPort:
    Number.isSafeInteger(configuredDebugPort) && configuredDebugPort > 0
      ? configuredDebugPort
      : null,
  identityPath: desktopIdentityPath,
  mainPid: process.pid,
  mainPgid: resolveMainProcessGroupId(),
  gitCommit: process.env.CORESTUDIO_GIT_COMMIT?.trim() || "packaged",
  gitDirty: process.env.CORESTUDIO_GIT_DIRTY === "1",
  appVersion: DESKTOP_APP_VERSION,
  buildId:
    process.env.CORESTUDIO_BUILD_ID?.trim() ||
    `${DESKTOP_APP_VERSION}-${desktopRuntimeLabel
      .toLowerCase()
      .replaceAll(" ", "-")}`,
});
const DESKTOP_TITLEBAR_HEIGHT = 44;
const configuredLauncherPid = Number(process.env.CORESTUDIO_LAUNCHER_PID);
if (
  desktopInstanceKind === "source-dev" &&
  Number.isSafeInteger(configuredLauncherPid) &&
  configuredLauncherPid > 0
) {
  const launcherLivenessGuard = createLauncherLivenessGuard({
    launcherPid: configuredLauncherPid,
    onOrphaned: () => {
      console.error(
        `[desktop:launcher-missing] launcherPID=${configuredLauncherPid}; shutting down SOURCE DEV`,
      );
      app.quit();
    },
  });
  setInterval(() => launcherLivenessGuard.check(), 500).unref();
}

const getProjectViewRegistry = () => {
  if (!projectViewRegistry) {
    throw Object.assign(new Error("Project renderer registry is not ready."), {
      code: "PROJECT_SESSION_REQUIRED",
    });
  }
  return projectViewRegistry;
};

const getProjectRoomSenderBindings = () => {
  if (!projectRoomSenderBindings) {
    throw Object.assign(
      new Error("Project room sender bindings are not ready."),
      { code: "PROJECT_SESSION_REQUIRED" },
    );
  }
  return projectRoomSenderBindings;
};

const getProjectViewBounds = (targetWindow: BrowserWindow) => {
  const { width, height } = targetWindow.getContentBounds();
  return {
    x: 0,
    y: DESKTOP_TITLEBAR_HEIGHT,
    width,
    height: Math.max(0, height - DESKTOP_TITLEBAR_HEIGHT),
  };
};

const requireShellSender = (sender: WebContents) => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    sender.id !== mainWindow.webContents.id
  ) {
    throw Object.assign(
      new Error("This project view action is only available to the app shell."),
      { code: "PROJECT_MISMATCH" },
    );
  }
};

const requireProjectRendererSender = (
  sender: WebContents,
  projectPath?: string,
) => {
  const registry = getProjectViewRegistry();
  if (projectPath) {
    return registry.requireSenderProject(sender.id, projectPath);
  }
  const project = registry
    .snapshot()
    .projects.find((candidate) => candidate.webContentsId === sender.id);
  if (!project) {
    throw Object.assign(
      new Error("The IPC sender is not a registered project renderer."),
      { code: "PROJECT_SESSION_REQUIRED" },
    );
  }
  return project;
};

const requireShellOrProjectRendererSender = (sender: WebContents) => {
  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    sender.id === mainWindow.webContents.id
  ) {
    return;
  }
  requireProjectRendererSender(sender);
};

const requireShellOrActiveProjectSenderForHome = (sender: WebContents) => {
  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    sender.id === mainWindow.webContents.id
  ) {
    return;
  }
  const project = requireProjectRendererSender(sender);
  if (
    getProjectViewRegistry().snapshot().activeProjectPath !==
    project.projectPath
  ) {
    throw Object.assign(
      new Error("Only the active project renderer can show the project Home."),
      { code: "PROJECT_MISMATCH" },
    );
  }
};

const releaseProjectRendererRoomSessions = (senderId: number) => {
  const sessionIds = projectRoomSenderBindings?.removeSender(senderId) ?? [];
  for (const sessionId of sessionIds) {
    projectRoomIpcController.leave(sessionId);
  }
};

const publishProjectViewsState = (state: DesktopProjectViewsState) => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    mainWindow.webContents.isDestroyed()
  ) {
    return;
  }
  mainWindow.webContents.send(IPC_CHANNELS.projectViewsState, state);
  Menu.setApplicationMenu(buildMenu());
};

const publishCanvasInteractionSettings = (
  settings: DesktopCanvasInteractionSettings,
) => {
  const rendererIds = new Set<number>();
  if (mainWindow && !mainWindow.isDestroyed()) {
    rendererIds.add(mainWindow.webContents.id);
  }
  for (const project of projectViewRegistry?.snapshot().projects ?? []) {
    rendererIds.add(project.webContentsId);
  }
  for (const rendererId of rendererIds) {
    const target = webContents.fromId(rendererId);
    if (target && !target.isDestroyed()) {
      target.send(IPC_CHANNELS.canvasInteractionSettingsChanged, settings);
    }
  }
};

const publishAppUpdateAvailability = (
  availability: DesktopAppUpdateAvailability,
) => {
  const rendererIds = new Set<number>();
  if (mainWindow && !mainWindow.isDestroyed()) {
    rendererIds.add(mainWindow.webContents.id);
  }
  for (const project of projectViewRegistry?.snapshot().projects ?? []) {
    rendererIds.add(project.webContentsId);
  }
  for (const rendererId of rendererIds) {
    const target = webContents.fromId(rendererId);
    if (target && !target.isDestroyed()) {
      target.send(IPC_CHANNELS.appUpdateAvailabilityChanged, availability);
    }
  }
};

installMainProcessErrorHandlers(
  process,
  createMainProcessErrorReporter({
    appName: desktopRuntime.appName,
    getLogPath: () =>
      path.join(
        desktopRuntime.settingsDirectory,
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
  const isTrustedDesktopRenderer = (candidate: WebContents | null) =>
    Boolean(
      candidate &&
        (candidate.id === targetWebContents.id ||
          projectViewRegistry
            ?.snapshot()
            .projects.some(
              (project) => project.webContentsId === candidate.id,
            )),
    );

  targetWebContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      callback(
        isTrustedDesktopRenderer(webContents) &&
          isClipboardPermission(permission),
      );
    },
  );

  targetWebContents.session.setPermissionCheckHandler(
    (webContents, permission) =>
      isTrustedDesktopRenderer(webContents) &&
      isClipboardPermission(permission),
  );
};

const configureProjectRendererPermissions = (
  targetWebContents: WebContents,
) => {
  const isTrustedProjectRenderer = (candidate: WebContents | null) =>
    Boolean(candidate && candidate.id === targetWebContents.id);
  targetWebContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      callback(
        isTrustedProjectRenderer(webContents) &&
          isClipboardPermission(permission),
      );
    },
  );
  targetWebContents.session.setPermissionCheckHandler(
    (webContents, permission) =>
      isTrustedProjectRenderer(webContents) &&
      isClipboardPermission(permission),
  );
};

const sendRendererMenuEvent = (
  event: DesktopMenuEvent,
  ownerWindow?: BaseWindow | null,
) => {
  const eventTarget = resolveDesktopMenuEventTarget(event);
  if (eventTarget !== "shell") {
    try {
      const activeProject = getProjectViewRegistry().resolveCommandProject();
      const targetProjectWebContents = webContents.fromId(
        activeProject.webContentsId,
      );
      if (targetProjectWebContents && !targetProjectWebContents.isDestroyed()) {
        targetProjectWebContents.send(IPC_CHANNELS.menuAction, event);
        return;
      }
    } catch {
      if (eventTarget === "active-project") {
        return;
      }
    }

    if (eventTarget === "active-project") {
      return;
    }
  }

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
      const manifest = await readProjectManifestSnapshot(project.projectPath);
      if (manifest.agentAccess.token === token) {
        return {
          projectPath: project.projectPath,
          name: manifest.name,
          agentAccess: manifest.agentAccess,
        };
      }
    } catch {
      // Stale recent entries are ignored here; normal project open will prune them.
    }
  }

  return null;
};

const getAgentProjectByStableBoardId = async (
  stableBoardId: string,
): Promise<LocalBridgeCurrentProject | null> => {
  const projectPaths = [
    ...(currentProject ? [currentProject.projectPath] : []),
    ...(await loadRecentProjects()).map((project) => project.projectPath),
  ];
  for (const projectPath of new Set(projectPaths)) {
    try {
      const manifest = await readProjectManifestSnapshot(projectPath);
      if (manifest.stableBoardId === stableBoardId) {
        return {
          projectPath,
          name: manifest.name,
          agentAccess: manifest.agentAccess,
        };
      }
    } catch {
      // Stale recent entries are ignored; the normal project picker can repair them.
    }
  }
  return null;
};

const getStableAgentBoardUrl = async (projectPath: string) => {
  const room = await projectRoomService.openProject(projectPath);
  const { stableBoardId } = await ensureProjectStableBoardId(
    room.identity.canonicalProjectPath,
  );
  return buildAgentBoardUrl({
    agentAccessEnabled,
    bridgeBaseUrl: localBridgeHandle?.baseUrl ?? null,
    stableBoardId,
  });
};

const getAgentBoardUrl = () => {
  return buildAgentBoardUrl({
    agentAccessEnabled,
    bridgeBaseUrl: localBridgeHandle?.baseUrl ?? null,
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
    appName: desktopRuntime.appName,
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

const syncActiveProjectDescriptor = createActiveProjectDescriptorSync({
  getActiveProjectPath: () =>
    projectViewRegistry?.snapshot().activeProjectPath ?? null,
  readProjectDescriptor: async (projectPath) => {
    const bundle = await readProjectBundle(projectPath);
    return {
      name: bundle.project.name,
      agentAccess: bundle.project.agentAccess,
    };
  },
  setCurrentProject,
});

const createMainRendererCommandBridge = () => {
  const requestTargetIds = new Map<string, number>();
  const resolveTargetWebContents = (payload: unknown) => {
    const explicitProjectPath =
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      "projectPath" in payload &&
      typeof payload.projectPath === "string"
        ? payload.projectPath
        : null;
    const project =
      getProjectViewRegistry().resolveCommandProject(explicitProjectPath);
    const targetWebContents = webContents.fromId(project.webContentsId);
    if (!targetWebContents || targetWebContents.isDestroyed()) {
      throw Object.assign(
        new Error(`Project renderer is not available: ${project.projectPath}`),
        {
          code: "PROJECT_SESSION_REQUIRED",
          details: {
            projectPath: project.projectPath,
            webContentsId: project.webContentsId,
          },
        },
      );
    }
    return targetWebContents;
  };
  return createRendererCommandBridge({
    send: (channel, request) => {
      const targetWebContents = resolveTargetWebContents(request.payload);
      requestTargetIds.set(request.requestId, targetWebContents.id);
      targetWebContents.send(channel, request);
    },
    onResponse: (listener) => {
      const handler = (
        event: IpcMainEvent,
        response: AgentRendererCommandResponse,
      ) => {
        if (requestTargetIds.get(response.requestId) !== event.sender.id) {
          return;
        }
        listener(response);
      };
      ipcMain.on(IPC_CHANNELS.agentCommandResponse, handler);
      return () => {
        ipcMain.removeListener(IPC_CHANNELS.agentCommandResponse, handler);
      };
    },
    // Target availability is resolved in send() from the authenticated
    // projectPath. Keeping this check registry-scoped preserves structured
    // routing errors instead of replacing them with a generic message.
    isAvailable: () => Boolean(projectViewRegistry),
    onSettled: (requestId) => {
      requestTargetIds.delete(requestId);
    },
  });
};

const startLocalBridge = async () => {
  if (localBridgeHandle) {
    return;
  }

  rendererCommandBridge = createMainRendererCommandBridge();
  let bridge: LocalBridgeServerHandle | null = null;
  try {
    bridge = await createLocalBridgeServer({
      preferredPort: desktopRuntime.bridgePort,
      allowDynamicPortFallback: false,
      agentBoardAssetsDir: rendererUrl
        ? undefined
        : path.join(__dirname, "..", "dist"),
      agentBoardDevServerUrl: rendererUrl ?? undefined,
      isAgentAccessEnabled: () => agentAccessEnabled,
      getAgentImageGenerationCapability: (host) =>
        agentImageGenerationService.getCapability(host),
      generateAgentImages: ({
        project,
        threadId,
        actorId,
        host,
        displayLabel,
        prompt,
        count,
        referenceFileIds,
        referenceElementIds,
      }) =>
        agentImageGenerationService.generate({
          projectPath: project.projectPath,
          threadId,
          actorId,
          host,
          displayLabel,
          prompt,
          count,
          referenceFileIds,
          referenceElementIds,
        }),
      getCurrentProject,
      getProjectByToken: getAgentProjectByToken,
      getBoardUrl: getAgentBoardUrl,
      getStableBoardUrl: (project) =>
        getStableAgentBoardUrl(project.projectPath),
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
      issueAgentSession: (input) => localAgentSessionStore.issue(input),
      resolveAgentSession: (sessionRef) =>
        localAgentSessionStore.resolve(sessionRef),
      issueProjectRoomTicket: async ({
        project,
        threadId,
        actorId,
        displayLabel,
      }) => {
        const room = await projectRoomService.openProject(project.projectPath);
        return {
          launchTicket: projectRoomTicketStore.issueLaunchTicket({
            identity: room.identity,
            actorId: resolveAgentActorId({ actorId, threadId }),
            displayLabel,
          }),
        };
      },
      claimStableBoardSession: async ({
        stableBoardId,
        pageNonce,
        threadId,
        actorId,
        displayLabel,
      }) => {
        if (!(await getAgentProjectByStableBoardId(stableBoardId))) {
          throw Object.assign(
            new Error("The stable Agent Board project could not be found."),
            { code: "PROJECT_REQUIRED", details: { stableBoardId } },
          );
        }
        stableBoardSessionClaimStore.claim({
          stableBoardId,
          pageNonce,
          actorId: resolveAgentActorId({ actorId, threadId }),
          displayLabel,
        });
      },
      exchangeStableBoardSession: async ({
        stableBoardId,
        pageNonce,
        actorResumeToken,
      }) => {
        if (!stableBoardActorResumeTokenService) {
          throw Object.assign(
            new Error("Stable Board actor recovery is not ready."),
            { code: "APP_NOT_READY" },
          );
        }
        stableBoardSessionClaimStore.register({ stableBoardId, pageNonce });
        if (
          actorResumeToken &&
          !stableBoardSessionClaimStore.hasClaim({
            stableBoardId,
            pageNonce,
          })
        ) {
          stableBoardSessionClaimStore.claim({
            stableBoardId,
            pageNonce,
            ...stableBoardActorResumeTokenService.verify({
              token: actorResumeToken,
              stableBoardId,
              pageNonce,
            }),
          });
        }
        const project = await getAgentProjectByStableBoardId(stableBoardId);
        if (!project) {
          throw Object.assign(
            new Error("The stable Agent Board project could not be found."),
            { code: "PROJECT_REQUIRED", details: { stableBoardId } },
          );
        }
        const actor = stableBoardSessionClaimStore.consume({
          stableBoardId,
          pageNonce,
        });
        const room = await projectRoomService.openProject(project.projectPath);
        return {
          launchTicket: projectRoomTicketStore.issueLaunchTicket({
            identity: room.identity,
            ...actor,
          }),
          actorResumeToken: stableBoardActorResumeTokenService.issue({
            stableBoardId,
            pageNonce,
            ...actor,
          }),
        };
      },
      inspectStableBoardIntegration: async ({ stableBoardId, pageNonce }) => {
        stableBoardSessionClaimStore.register({ stableBoardId, pageNonce });
        const project = await getAgentProjectByStableBoardId(stableBoardId);
        const issues: Array<{
          code: "PROJECT_NOT_FOUND";
          message: string;
        }> = [];
        if (!project) {
          issues.push({
            code: "PROJECT_NOT_FOUND",
            message:
              "CoreStudio 找不到这个画布对应的本地项目。项目可能已经移动或删除。",
          });
        }
        const projectUnavailable = issues.some(
          (issue) => issue.code === "PROJECT_NOT_FOUND",
        );
        return {
          state: projectUnavailable
            ? ("project-unavailable" as const)
            : ("ready" as const),
          appVersion: DESKTOP_APP_VERSION,
          integrationVersion: AGENT_INTEGRATION_VERSION,
          bridgeProtocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
          actorClaimed: stableBoardSessionClaimStore.hasClaim({
            stableBoardId,
            pageNonce,
          }),
          ...(project ? { projectName: project.name } : {}),
          issues,
        };
      },
      issueBoardProjectSelection: async ({
        threadId,
        actorId,
        displayLabel,
      }) => ({
        selectionToken: boardProjectSelectionStore.issue({
          actorId: resolveAgentActorId({ actorId, threadId }),
          displayLabel,
        }),
      }),
      issueBoardProjectSelectionFromStableBoard: async ({
        stableBoardId,
        pageNonce,
        actorResumeToken,
      }) => {
        if (!stableBoardActorResumeTokenService) {
          throw Object.assign(
            new Error("Stable Board actor recovery is not ready."),
            { code: "APP_NOT_READY" },
          );
        }
        const project = await getAgentProjectByStableBoardId(stableBoardId);
        if (!project) {
          throw Object.assign(
            new Error("The stable Agent Board project could not be found."),
            { code: "PROJECT_REQUIRED", details: { stableBoardId } },
          );
        }
        return {
          selectionToken: boardProjectSelectionStore.issue({
            ...stableBoardActorResumeTokenService.verify({
              token: actorResumeToken,
              stableBoardId,
              pageNonce,
            }),
            currentProjectPath: project.projectPath,
          }),
        };
      },
      listBoardProjectCandidates: async (selectionToken) => {
        const grant = boardProjectSelectionStore.authorize(selectionToken);
        return buildBoardProjectCandidates({
          projects: await loadRecentProjects(),
          currentProjectPath: grant.currentProjectPath,
          readProject: readProjectManifestSnapshot,
          canOpenProject: (projectPath) =>
            projectProcessLeaseRegistry.canAcquire(projectPath),
        });
      },
      openBoardProjectCandidate: async ({ selectionToken, projectPath }) => {
        const grant = boardProjectSelectionStore.authorize(selectionToken);
        if (grant.currentProjectPath === projectPath) {
          throw Object.assign(
            new Error("The selected project is already current."),
            { code: "BAD_REQUEST", details: { projectPath } },
          );
        }
        const candidates = await loadRecentProjects();
        if (
          !candidates.some((candidate) => candidate.projectPath === projectPath)
        ) {
          throw Object.assign(
            new Error("The selected project is not an available candidate."),
            {
              code: "BAD_REQUEST",
              details: { projectPath },
            },
          );
        }
        const manifest = await readProjectManifestSnapshot(projectPath);
        const boardUrl = await getStableAgentBoardUrl(projectPath);
        if (!boardUrl) {
          throw Object.assign(
            new Error("Stable Agent Board access is unavailable."),
            { code: "CAPABILITY_UNAVAILABLE" },
          );
        }
        boardProjectSelectionStore.consume(selectionToken);
        const returnSelectionToken = boardProjectSelectionStore.issue({
          actorId: grant.actorId,
          displayLabel: grant.displayLabel,
          currentProjectPath: projectPath,
        });
        return {
          boardUrl,
          returnSelectionToken,
          project: {
            projectPath,
            name: manifest.name,
          },
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
          validateOperationAssets: (operation) =>
            validateProjectRoomOperationAssets(room, operation),
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
        return persistAndPublishProjectRoomAssets({
          projectPath: room.identity.canonicalProjectPath,
          files,
        });
      },
      withAgentWriterCommand: async (
        { project, threadId, actorId, displayLabel, dryRun },
        run,
      ) => {
        const room = await projectRoomService.openProject(project.projectPath);
        return executeProjectRoomAgentWriterCommand({
          room,
          actorId: resolveAgentActorId({ actorId, threadId }),
          displayLabel,
          prepare: run,
          persistAssets: (files) =>
            persistAndPublishProjectRoomAssets({
              projectPath: room.identity.canonicalProjectPath,
              files,
            }),
          validateOperation: (operation) =>
            validateProjectRoomOperationAssets(room, operation),
          dryRun,
        });
      },
      getProjectRoomParticipantState: async ({
        project,
        threadId,
        actorId,
      }) => {
        const room = await projectRoomService.findOpenRoom(project.projectPath);
        return (
          room?.getParticipantSelectionByActor(
            resolveAgentActorId({ actorId, threadId }),
          ) ?? null
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
  const previousSettings = await loadAgentAccessSettings();
  const settings = await saveAgentAccessSettings({
    ...previousSettings,
    enabled,
  });
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
    await saveAgentAccessSettings({
      ...previousSettings,
      enabled: previousEnabled,
    }).catch((persistError) => {
      console.error("[agent:bridge-enable-rollback-failed]", persistError);
    });
    Menu.setApplicationMenu(buildMenu());
    throw error;
  }

  Menu.setApplicationMenu(buildMenu());
  return getAgentBridgeStatus();
};

const desktopEditContext = createDesktopEditContextController();

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

  const focusedWebContents = webContents.getFocusedWebContents();
  if (
    focusedWebContents &&
    desktopEditContext.runAction(focusedWebContents, event.action)
  ) {
    return;
  }

  sendRendererMenuEvent(event, ownerWindow);
};

const registerDesktopEditShortcuts = (targetWebContents: WebContents) => {
  targetWebContents.on("before-input-event", (event, input) => {
    const action = resolveDesktopEditShortcut(input, process.platform);
    if (desktopEditContext.runAction(targetWebContents, action)) {
      event.preventDefault();
      return;
    }
    if (!action) {
      return;
    }

    event.preventDefault();
    sendMenuAction({ action });
  });
  targetWebContents.on("did-start-navigation", () => {
    desktopEditContext.setNativeTextContext(targetWebContents, false);
  });
  targetWebContents.once("destroyed", () => {
    desktopEditContext.forget(targetWebContents);
  });
};

const buildProjectBundle = async (
  projectPath: string,
  options: { safeMode?: boolean } = {},
) => {
  const { room, bundle } = await projectRoomService.openProjectWithBundle(
    projectPath,
  );
  const canonicalProjectPath = room.identity.canonicalProjectPath;
  currentRecentProjects = await rememberRecentProject(
    canonicalProjectPath,
    bundle.project.name,
  );
  Menu.setApplicationMenu(buildMenu());
  return {
    projectPath: canonicalProjectPath,
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

const openRecentProjectBundle = async (
  projectPath: string,
  options: DesktopProjectViewOpenOptions = {},
) => {
  try {
    return await buildProjectBundle(projectPath, options);
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
  targetWebContents: WebContents,
  timeoutMs = 5000,
) =>
  new Promise<void>((resolve, reject) => {
    if (targetWebContents.isDestroyed()) {
      reject(new Error("窗口已经关闭，无法完成项目保存。"));
      return;
    }

    const requestId = ++latestProjectRoomFlushRequestId;
    const timeout = setTimeout(() => {
      pendingProjectRoomFlushes.delete(requestId);
      reject(new Error("等待项目保存超时。"));
    }, timeoutMs);

    pendingProjectRoomFlushes.set(requestId, {
      expectedSenderId: targetWebContents.id,
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

    targetWebContents.send(IPC_CHANNELS.flushProjectRoomRequest, {
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
  projectName: string,
  participants: Array<{ displayLabel: string }>,
) => {
  const result = await dialog.showMessageBox(targetWindow, {
    type: "warning",
    buttons: ["关闭项目", "取消"],
    defaultId: 1,
    cancelId: 1,
    message: `仍有 Agent 正在“${projectName}”中工作`,
    detail: `关闭项目后，以下协作会立即断开：\n${participants
      .map((participant) => `• ${participant.displayLabel}`)
      .join("\n")}`,
  });
  return result.response === 0;
};

const confirmForceCloseAfterParticipantChanges = async (
  targetWindow: BrowserWindow,
) => {
  const result = await dialog.showMessageBox(targetWindow, {
    type: "warning",
    buttons: ["强制关闭", "取消"],
    defaultId: 1,
    cancelId: 1,
    message: "协作成员持续变化",
    detail:
      "无法安全确认当前关闭状态。强制关闭后，仍在工作的 Agent 会立即断开。",
  });
  return result.response === 0;
};

const closeWindowAfterProjectRoomFlush = async (
  targetWindow: BrowserWindow,
  attempt = 1,
) => {
  const openRooms = projectRoomService.manager.list();
  const confirmedCloseRequests: Array<{
    projectPath: string;
    expectedRoomId: string;
    acknowledgedParticipantSessionIds: string[];
  }> = [];
  for (const room of openRooms) {
    const closeState = await projectRoomService.getCloseState(
      room.identity.canonicalProjectPath,
    );
    if (!closeState) {
      continue;
    }
    const collaborators = selectProjectRoomAgentPresence(
      closeState.otherParticipants,
    );
    if (
      collaborators.length > 0 &&
      !(await confirmDisconnectProjectParticipants(
        targetWindow,
        path.basename(room.identity.canonicalProjectPath),
        collaborators,
      ))
    ) {
      quitState.clearQuitRequest();
      return;
    }
    confirmedCloseRequests.push({
      projectPath: room.identity.canonicalProjectPath,
      expectedRoomId: closeState.roomId,
      acknowledgedParticipantSessionIds: closeState.otherParticipants.map(
        (participant) => participant.sessionId,
      ),
    });
  }
  if (openRooms.length > 0) {
    try {
      const projectRendererIds =
        projectViewRegistry
          ?.snapshot()
          .projects.map((project) => project.webContentsId) ?? [];
      await Promise.all(
        projectRendererIds.map(async (webContentsId) => {
          const targetWebContents = webContents.fromId(webContentsId);
          if (targetWebContents) {
            await requestRendererProjectRoomFlush(targetWebContents);
          }
        }),
      );
      await projectRoomService.closeProjectPaths(confirmedCloseRequests, {
        reason: "app-closed",
        requireExactRoomSet: true,
      });
      for (const room of openRooms) {
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
        if (attempt < 3) {
          return closeWindowAfterProjectRoomFlush(targetWindow, attempt + 1);
        }
        const shouldForceClose = await confirmForceCloseAfterParticipantChanges(
          targetWindow,
        );
        if (shouldForceClose) {
          for (const room of projectRoomService.manager.list()) {
            await projectRoomService.closeProjectPath(
              room.identity.canonicalProjectPath,
              {
                force: true,
                reason: "app-closed",
              },
            );
            projectRoomTicketStore.revokeRoom(room.identity);
          }
          allowWindowClose = true;
          targetWindow.close();
        } else {
          quitState.clearQuitRequest();
        }
        return;
      }
      console.error("[project-room:close-persist-failed]", error);
      const shouldForceClose = await showCloseAfterSaveFailedDialog(
        targetWindow,
        error,
      );
      if (shouldForceClose) {
        for (const room of projectRoomService.manager.list()) {
          await projectRoomService.closeProjectPath(
            room.identity.canonicalProjectPath,
            {
              force: true,
              reason: "app-closed",
            },
          );
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
  try {
    const projectRendererIds =
      projectViewRegistry
        ?.snapshot()
        .projects.map((project) => project.webContentsId) ?? [];
    await Promise.all(
      projectRendererIds.map(async (webContentsId) => {
        const targetWebContents = webContents.fromId(webContentsId);
        if (targetWebContents) {
          await requestRendererProjectRoomFlush(targetWebContents);
        }
      }),
    );
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

const toProjectViewDescriptor = (bundle: DesktopProjectBundle) => {
  const projectId = bundle.project.projectId;
  if (!projectId) {
    throw Object.assign(
      new Error("Project manifest is missing a stable project id."),
      { code: "PROJECT_MISMATCH" },
    );
  }
  return {
    projectPath: bundle.projectPath,
    projectId,
    name: bundle.project.name,
    ...(bundle.safeMode ? { safeMode: true } : {}),
  };
};

const setActiveProjectFromPath = async (projectPath: string | null) => {
  await syncActiveProjectDescriptor(projectPath);
};

const openProjectView = async (
  projectPath: string,
  options: DesktopProjectViewOpenOptions = {},
) => {
  const bundle = await openRecentProjectBundle(projectPath, options);
  const registry = getProjectViewRegistry();
  registry.open(toProjectViewDescriptor(bundle));
  registry.setBounds(
    mainWindow
      ? getProjectViewBounds(mainWindow)
      : {
          x: 0,
          y: DESKTOP_TITLEBAR_HEIGHT,
          width: 0,
          height: 0,
        },
  );
  await setActiveProjectFromPath(bundle.projectPath);
  return registry.snapshot();
};

const closeProjectViewWithProtection = async (
  targetWindow: BrowserWindow,
  projectPath: string,
  attempt = 1,
): Promise<DesktopProjectViewsState> => {
  const registry = getProjectViewRegistry();
  const project = registry
    .snapshot()
    .projects.find((candidate) => candidate.projectPath === projectPath);
  if (!project) {
    return registry.snapshot();
  }
  const room = await projectRoomService.findOpenRoom(projectPath);
  const closeState = room
    ? await projectRoomService.getCloseState(projectPath)
    : null;
  const collaborators = selectProjectRoomAgentPresence(
    closeState?.otherParticipants ?? [],
  );
  if (
    collaborators.length > 0 &&
    !(await confirmDisconnectProjectParticipants(
      targetWindow,
      project.name,
      collaborators,
    ))
  ) {
    return registry.snapshot();
  }

  try {
    const targetWebContents = webContents.fromId(project.webContentsId);
    if (targetWebContents) {
      await requestRendererProjectRoomFlush(targetWebContents);
    }
    if (room && closeState) {
      const closed = await projectRoomService.closeProjectPath(projectPath, {
        reason: "project-closed",
        expectedRoomId: closeState.roomId,
        acknowledgedParticipantSessionIds: closeState.otherParticipants.map(
          (participant) => participant.sessionId,
        ),
      });
      if (!closed) {
        throw new Error("项目房间未能关闭。");
      }
      projectRoomTicketStore.revokeRoom(room.identity);
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "PARTICIPANTS_CHANGED"
    ) {
      if (attempt < 3) {
        return closeProjectViewWithProtection(
          targetWindow,
          projectPath,
          attempt + 1,
        );
      }
      if (!(await confirmForceCloseAfterParticipantChanges(targetWindow))) {
        return registry.snapshot();
      }
    } else if (!(await showCloseAfterSaveFailedDialog(targetWindow, error))) {
      return registry.snapshot();
    }
    const activeRoom = await projectRoomService.findOpenRoom(projectPath);
    if (activeRoom) {
      await projectRoomService.closeProjectPath(projectPath, {
        force: true,
        reason: "project-closed",
      });
      projectRoomTicketStore.revokeRoom(activeRoom.identity);
    }
  }

  registry.close(projectPath);
  await setActiveProjectFromPath(registry.snapshot().activeProjectPath);
  return registry.snapshot();
};

const registerIpcHandlers = () => {
  ipcMain.on(IPC_CHANNELS.nativeEditContextChanged, (event, nativeContext) => {
    requireShellOrProjectRendererSender(event.sender);
    desktopEditContext.setNativeTextContext(event.sender, nativeContext);
  });

  ipcMain.on(IPC_CHANNELS.rendererReady, (event) => {
    if (
      !mainWindow ||
      mainWindow.isDestroyed() ||
      event.sender.id !== mainWindow.webContents.id
    ) {
      return;
    }
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
    (event, payload: DesktopProjectStateChangedPayload) => {
      if (!payload.currentProject) {
        return;
      }
      getProjectViewRegistry().requireSenderProject(
        event.sender.id,
        payload.currentProject.projectPath,
      );
      if (
        getProjectViewRegistry().snapshot().activeProjectPath ===
        payload.currentProject.projectPath
      ) {
        void setCurrentProject(payload.currentProject);
      }
    },
  );
  ipcMain.on(IPC_CHANNELS.projectThemeChanged, (event, payload: unknown) => {
    if (
      !payload ||
      typeof payload !== "object" ||
      !("projectPath" in payload) ||
      typeof payload.projectPath !== "string" ||
      !("theme" in payload) ||
      (payload.theme !== "light" && payload.theme !== "dark")
    ) {
      throw new Error("Project theme update is invalid.");
    }
    const registry = getProjectViewRegistry();
    registry.requireSenderProject(event.sender.id, payload.projectPath);
    registry.setTheme(event.sender.id, payload.theme);
  });

  ipcMain.handle(IPC_CHANNELS.loadProjectViewsState, async (event) => {
    requireShellSender(event.sender);
    return getProjectViewRegistry().snapshot();
  });
  ipcMain.handle(
    IPC_CHANNELS.openProjectView,
    async (
      event,
      projectPath: unknown,
      options: DesktopProjectViewOpenOptions | undefined,
    ) => {
      requireShellSender(event.sender);
      if (typeof projectPath !== "string" || projectPath.length === 0) {
        throw new Error("Project view requires a project path.");
      }
      return openProjectView(projectPath, {
        safeMode: options?.safeMode === true,
      });
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.activateProjectView,
    async (event, projectPath: unknown) => {
      const registry = getProjectViewRegistry();
      if (projectPath === null) {
        requireShellOrActiveProjectSenderForHome(event.sender);
        registry.showHome();
        await setActiveProjectFromPath(null);
        return registry.snapshot();
      }
      requireShellSender(event.sender);
      if (typeof projectPath !== "string" || projectPath.length === 0) {
        throw new Error("Project view activation requires a project path.");
      }
      registry.activate(projectPath);
      await setActiveProjectFromPath(projectPath);
      return registry.snapshot();
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.closeProjectView,
    async (event, projectPath: unknown) => {
      requireShellSender(event.sender);
      if (typeof projectPath !== "string" || projectPath.length === 0) {
        throw new Error("Project view close requires a project path.");
      }
      const targetWindow = getTargetWindow();
      if (!targetWindow) {
        throw new Error("CoreStudio window is not available.");
      }
      return closeProjectViewWithProtection(targetWindow, projectPath);
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.reorderProjectViews,
    async (event, projectPaths: unknown) => {
      requireShellSender(event.sender);
      if (
        !Array.isArray(projectPaths) ||
        projectPaths.some(
          (projectPath) =>
            typeof projectPath !== "string" || projectPath.length === 0,
        )
      ) {
        throw new Error("Project tab order is invalid.");
      }
      const registry = getProjectViewRegistry();
      registry.reorder(projectPaths);
      return registry.snapshot();
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.recoverProjectView,
    async (event, projectPath: unknown) => {
      requireShellSender(event.sender);
      if (typeof projectPath !== "string" || projectPath.length === 0) {
        throw new Error("Project view recovery requires a project path.");
      }
      const registry = getProjectViewRegistry();
      registry.recover(projectPath);
      registry.setBounds(
        mainWindow
          ? getProjectViewBounds(mainWindow)
          : {
              x: 0,
              y: DESKTOP_TITLEBAR_HEIGHT,
              width: 0,
              height: 0,
            },
      );
      return registry.snapshot();
    },
  );

  ipcMain.handle(IPC_CHANNELS.getAgentBridgeStatus, async (event) => {
    requireShellOrProjectRendererSender(event.sender);
    return getAgentBridgeStatus();
  });
  ipcMain.handle(
    IPC_CHANNELS.getStableAgentBoardUrl,
    async (event, projectPath: unknown) => {
      if (typeof projectPath !== "string" || projectPath.length === 0) {
        throw Object.assign(
          new Error("Stable Board URL requires a project path."),
          { code: "PROJECT_MISMATCH" },
        );
      }
      requireProjectRendererSender(event.sender, projectPath);
      return getStableAgentBoardUrl(projectPath);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.setAgentBridgeEnabled,
    async (event, enabled: unknown) => {
      requireProjectRendererSender(event.sender);
      if (typeof enabled !== "boolean") {
        throw new Error("Agent Bridge enabled state must be a boolean.");
      }

      return setAgentBridgeEnabled(enabled);
    },
  );

  ipcMain.handle(IPC_CHANNELS.getAgentIntegrationSettings, async (event) => {
    requireShellOrProjectRendererSender(event.sender);
    const settings = await loadAgentAccessSettings();
    return settings.integrations;
  });

  ipcMain.handle(
    IPC_CHANNELS.setCodexImageGenerationEnabled,
    async (event, enabled: unknown) => {
      requireShellOrProjectRendererSender(event.sender);
      if (typeof enabled !== "boolean") {
        throw new Error("Codex image generation permission must be a boolean.");
      }
      const settings = await loadAgentAccessSettings();
      const saved = await saveAgentAccessSettings({
        ...settings,
        integrations: {
          ...settings.integrations,
          codex: {
            ...settings.integrations.codex,
            allowImageGeneration: enabled,
          },
        },
      });
      return saved.integrations;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.setAgentImageGenerationEnabled,
    async (event, host: unknown, enabled: unknown) => {
      requireShellOrProjectRendererSender(event.sender);
      if (!isAgentHost(host) || typeof enabled !== "boolean") {
        throw new Error(
          "Agent host and image generation permission are invalid.",
        );
      }
      const settings = await loadAgentAccessSettings();
      const saved = await saveAgentAccessSettings({
        ...settings,
        integrations: {
          ...settings.integrations,
          [host]: {
            ...settings.integrations[host],
            allowImageGeneration: enabled,
          },
        },
      });
      return saved.integrations;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.projectRoomJoin,
    async (event, input: DesktopProjectRoomJoinInput) => {
      const sender = event.sender;
      const senderBindings = getProjectRoomSenderBindings();
      senderBindings.bind({
        sessionId: input.sessionId,
        senderId: sender.id,
        projectPath: input.projectPath,
      });
      let snapshot;
      try {
        snapshot = projectRoomIpcController.join(input, (roomEvent) => {
          if (sender.isDestroyed()) {
            projectRoomIpcController.leave(input.sessionId);
            return;
          }
          const envelope: DesktopProjectRoomEventEnvelope = {
            sessionId: input.sessionId,
            event: roomEvent,
          };
          sender.send(IPC_CHANNELS.projectRoomEvent, envelope);
        });
      } catch (error) {
        senderBindings.removeSession(sender.id, input.sessionId);
        throw error;
      }
      sender.once("destroyed", () => {
        projectRoomSenderBindings?.removeSender(sender.id);
        projectRoomIpcController.leave(input.sessionId);
      });
      return snapshot;
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomResync,
    async (event, sessionId: string) => {
      getProjectRoomSenderBindings().requireSession(event.sender.id, sessionId);
      return projectRoomIpcController.resync(sessionId);
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomOperation,
    async (
      event,
      input: {
        sessionId: string;
        operation: ProjectRoomSceneOperation;
      },
    ) => {
      getProjectRoomSenderBindings().requireSession(
        event.sender.id,
        input.sessionId,
      );
      return projectRoomIpcController.applySceneOperation(
        input.sessionId,
        input.operation,
      );
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomFlushPersistence,
    async (event, sessionId: string) => {
      getProjectRoomSenderBindings().requireSession(event.sender.id, sessionId);
      return projectRoomIpcController.flushPersistence(sessionId);
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomLeave,
    async (event, sessionId: string) => {
      getProjectRoomSenderBindings().removeSession(event.sender.id, sessionId);
      return projectRoomIpcController.leave(sessionId);
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.projectRoomCloseState,
    async (event, input: { projectPath: string; sessionId: string }) => {
      getProjectRoomSenderBindings().requireSession(
        event.sender.id,
        input.sessionId,
      );
      getProjectViewRegistry().requireSenderProject(
        event.sender.id,
        input.projectPath,
      );
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
      event,
      input: {
        projectPath: string;
        force?: boolean;
        expectedRoomId?: string;
        requestingSessionId?: string;
        acknowledgedParticipantSessionIds?: string[];
      },
    ) => {
      getProjectViewRegistry().requireSenderProject(
        event.sender.id,
        input.projectPath,
      );
      if (input.requestingSessionId) {
        getProjectRoomSenderBindings().requireSession(
          event.sender.id,
          input.requestingSessionId,
        );
      }
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
    (event, response: DesktopProjectRoomFlushResponse) => {
      const pendingFlush = pendingProjectRoomFlushes.get(response.requestId);
      if (!pendingFlush || pendingFlush.expectedSenderId !== event.sender.id) {
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

  ipcMain.handle(IPC_CHANNELS.createProject, async (event) => {
    requireShellSender(event.sender);
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

  ipcMain.handle(IPC_CHANNELS.openProject, async (event) => {
    requireShellSender(event.sender);
    const selectedPath = await chooseOpenProjectDirectory(mainWindow);
    if (!selectedPath) {
      return null;
    }
    return buildProjectBundle(selectedPath);
  });

  ipcMain.handle(
    IPC_CHANNELS.openRecentProject,
    async (event, projectPath: string) => {
      const project = getProjectViewRegistry().requireSenderProject(
        event.sender.id,
        projectPath,
      );
      return openRecentProjectBundle(projectPath, {
        safeMode: project.safeMode,
      });
    },
  );

  ipcMain.handle(IPC_CHANNELS.loadRecentProjects, async () => {
    return loadRecentProjects();
  });

  ipcMain.handle(
    IPC_CHANNELS.removeRecentProject,
    async (event, projectPath: string) => {
      requireShellSender(event.sender);
      currentRecentProjects = await removeRecentProject(projectPath);
      Menu.setApplicationMenu(buildMenu());
      return currentRecentProjects;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.readProjectAssetPayloads,
    async (event, input) => {
      requireProjectRendererSender(event.sender, input.projectPath);
      return readProjectAssetPayloads(input);
    },
  );

  ipcMain.handle(IPC_CHANNELS.inspectProjectHealth, async (event, input) => {
    requireProjectRendererSender(event.sender, input.projectPath);
    return inspectProjectHealth(input);
  });

  ipcMain.handle(
    IPC_CHANNELS.rebuildProjectThumbnails,
    async (event, input) => {
      requireProjectRendererSender(event.sender, input.projectPath);
      const activeRoom = await projectRoomService.findOpenRoom(
        input.projectPath,
      );
      if (activeRoom) {
        await activeRoom.flushPersistence();
      }
      const result = await rebuildProjectThumbnails(input, {
        writeProjectScene: (sceneInput) =>
          projectRoomService.writeMaintenanceScene(sceneInput),
      });
      if (activeRoom) {
        const bundle = await readProjectBundle(input.projectPath);
        if (
          activeRoom.lifecycle === "active" ||
          activeRoom.lifecycle === "storage-error"
        ) {
          activeRoom.publishAssetRecords(bundle.imageRecords);
        }
      }
      return activeRoom
        ? {
            ...result,
            // The repaired scene was already published as one authoritative
            // maintenance operation. Renderer assets refresh independently.
            restoredSceneJson: null,
          }
        : result;
    },
  );

  ipcMain.handle(IPC_CHANNELS.cleanProjectCache, async (event, input) => {
    requireProjectRendererSender(event.sender, input.projectPath);
    return cleanProjectCache(input);
  });

  ipcMain.handle(IPC_CHANNELS.persistImageAssets, async (event, input) => {
    requireProjectRendererSender(event.sender, input.projectPath);
    return persistAndPublishProjectRoomAssets(input);
  });

  ipcMain.handle(IPC_CHANNELS.beginImageWriteback, async (event, input) => {
    requireProjectRendererSender(event.sender, input.projectPath);
    return beginProjectImageWriteback(input);
  });

  ipcMain.handle(IPC_CHANNELS.commitImageWriteback, async (event, input) => {
    requireProjectRendererSender(event.sender, input.projectPath);
    const result = await commitProjectImageWriteback(input);
    const room = await projectRoomService.findOpenRoom(input.projectPath);
    if (room) {
      const bundle = await readProjectBundle(input.projectPath);
      if (room.lifecycle === "active" || room.lifecycle === "storage-error") {
        room.publishAssetRecords(bundle.imageRecords);
      }
    }
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.rollbackImageWriteback, async (event, input) => {
    requireProjectRendererSender(event.sender, input.projectPath);
    return rollbackProjectImageWriteback(input);
  });

  ipcMain.handle(IPC_CHANNELS.importImages, async (event) => {
    requireProjectRendererSender(event.sender);
    return importImagesFromDisk();
  });

  ipcMain.handle(
    IPC_CHANNELS.revealProjectInFinder,
    async (event, projectPath: string) => {
      if (event.sender.id !== mainWindow?.webContents.id) {
        requireProjectRendererSender(event.sender, projectPath);
      }
      shell.showItemInFolder(path.join(projectPath, PROJECT_FILENAMES.project));
    },
  );

  ipcMain.handle(IPC_CHANNELS.loadAppInfo, async (event) => {
    requireShellOrProjectRendererSender(event.sender);
    return {
      name: desktopRuntime.appName,
      version: DESKTOP_APP_VERSION,
      runtimeIdentity: desktopStartupIdentity,
    };
  });

  ipcMain.handle(IPC_CHANNELS.loadAppUpdateAvailability, async (event) => {
    requireShellOrProjectRendererSender(event.sender);
    if (!appUpdateService) {
      throw new Error("App update service is not ready.");
    }
    return appUpdateService.getAvailability();
  });

  ipcMain.handle(IPC_CHANNELS.checkForAppUpdates, async (event) => {
    requireShellOrProjectRendererSender(event.sender);
    if (!appUpdateService) {
      return { ok: false, failure: { code: "unsupported" } } as const;
    }
    return appUpdateService.checkManually();
  });

  ipcMain.handle(IPC_CHANNELS.openExternal, async (event, value: unknown) => {
    requireShellOrProjectRendererSender(event.sender);
    if (typeof value !== "string") {
      throw new Error("External URL must be a string.");
    }

    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error("Only HTTPS external URLs are allowed.");
    }

    await shell.openExternal(url.toString());
  });

  ipcMain.handle(IPC_CHANNELS.inspectCodexIntegration, async (event) => {
    requireShellOrProjectRendererSender(event.sender);
    return inspectAgentIntegration({
      host: "codex",
      homeDir: app.getPath("home"),
      settingsDirectory: desktopRuntime.settingsDirectory,
      resourcesPath: process.resourcesPath,
      appVersion: DESKTOP_APP_VERSION,
    });
  });

  ipcMain.handle(
    IPC_CHANNELS.installCodexIntegration,
    async (event, ...args) => {
      requireShellOrProjectRendererSender(event.sender);
      if (args.length > 0) {
        throw new Error(
          "Codex integration installer does not accept arguments.",
        );
      }
      return installAgentIntegration({
        host: "codex",
        homeDir: app.getPath("home"),
        settingsDirectory: desktopRuntime.settingsDirectory,
        resourcesPath: process.resourcesPath,
        appVersion: DESKTOP_APP_VERSION,
      });
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.inspectAgentIntegration,
    async (event, host: unknown) => {
      requireShellOrProjectRendererSender(event.sender);
      if (!isAgentHost(host)) {
        throw new Error("Unsupported Agent host.");
      }
      return inspectAgentIntegration({
        host,
        homeDir: app.getPath("home"),
        settingsDirectory: desktopRuntime.settingsDirectory,
        resourcesPath: process.resourcesPath,
        appVersion: DESKTOP_APP_VERSION,
      });
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.installAgentIntegration,
    async (event, host: unknown) => {
      requireShellOrProjectRendererSender(event.sender);
      if (!isAgentHost(host)) {
        throw new Error("Unsupported Agent host.");
      }
      return installAgentIntegration({
        host,
        homeDir: app.getPath("home"),
        settingsDirectory: desktopRuntime.settingsDirectory,
        resourcesPath: process.resourcesPath,
        appVersion: DESKTOP_APP_VERSION,
      });
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.removeAgentIntegration,
    async (event, host: unknown) => {
      requireShellOrProjectRendererSender(event.sender);
      if (!isAgentHost(host)) {
        throw new Error("Unsupported Agent host.");
      }
      return removeAgentIntegration({
        host,
        homeDir: app.getPath("home"),
        settingsDirectory: desktopRuntime.settingsDirectory,
        resourcesPath: process.resourcesPath,
      });
    },
  );

  ipcMain.handle(IPC_CHANNELS.loadProviderSettings, async (event) => {
    requireShellOrProjectRendererSender(event.sender);
    return {
      ...(await loadProviderSettings()),
      modelCatalog: modelCatalogService?.getState(),
    };
  });

  ipcMain.handle(
    IPC_CHANNELS.saveProviderSettings,
    async (event, input: SaveProviderSettingsInput) => {
      requireShellOrProjectRendererSender(event.sender);
      return {
        ...(await saveProviderSettings(input)),
        modelCatalog: modelCatalogService?.getState(),
      };
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.deleteProviderSettings,
    async (event, input: DeleteProviderSettingsInput) => {
      requireShellOrProjectRendererSender(event.sender);
      return {
        ...(await deleteProviderSettings(input)),
        modelCatalog: modelCatalogService?.getState(),
      };
    },
  );
  ipcMain.handle(
    IPC_CHANNELS.setGenerateComposerVisible,
    async (event, visible: boolean) => {
      requireShellOrProjectRendererSender(event.sender);
      return {
        ...(await setGenerateComposerVisible(visible)),
        modelCatalog: modelCatalogService?.getState(),
      };
    },
  );
  ipcMain.handle(IPC_CHANNELS.refreshModelCatalog, async (event) => {
    requireShellOrProjectRendererSender(event.sender);
    if (!modelCatalogService) {
      throw new Error("模型目录服务尚未初始化。");
    }
    const modelCatalog = await modelCatalogService.refresh();
    if (modelCatalog.catalog) {
      await migrateProviderDefaultModels(modelCatalog.catalog.modelAliases);
    }
    return {
      ...(await loadProviderSettings()),
      modelCatalog,
    };
  });
  ipcMain.handle(
    IPC_CHANNELS.generateImages,
    async (event, input: GenerateImagesInput) => {
      requireProjectRendererSender(event.sender, input.projectPath);
      return generationRequestController.generate(input);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cancelGenerateImages,
    async (event, generationJobId: string) => {
      requireProjectRendererSender(event.sender);
      generationRequestController.cancel(generationJobId);
    },
  );

  ipcMain.handle(IPC_CHANNELS.readClipboardImage, async (event) => {
    requireProjectRendererSender(event.sender);
    return readClipboardImageFromSystem();
  });

  ipcMain.handle(IPC_CHANNELS.writeProjectClipboard, async (event, input) => {
    requireProjectRendererSender(event.sender, input.projectPath);
    if (!Array.isArray(input.elements)) {
      throw new Error("Project clipboard elements must be an array.");
    }
    await writeProjectElementsToClipboard({
      projectPath: input.projectPath,
      elements: input.elements,
      readProjectAssetPayloads: async (assetInput) =>
        (
          await readProjectAssetPayloads(assetInput)
        ).filter((asset): asset is NonNullable<typeof asset> => asset !== null),
      writeClipboard: ({ text, previewImageDataUrl }) => {
        if (!previewImageDataUrl) {
          clipboard.writeText(text);
          return;
        }
        const image = nativeImage.createFromDataURL(previewImageDataUrl);
        if (image.isEmpty()) {
          clipboard.writeText(text);
          return;
        }
        clipboard.write({ text, image });
      },
    });
  });
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
  ipcMain.handle(IPC_CHANNELS.loadCanvasInteractionSettings, async (event) => {
    requireShellOrProjectRendererSender(event.sender);
    if (!canvasInteractionSettingsController) {
      throw new Error("Canvas interaction settings are not ready.");
    }
    return canvasInteractionSettingsController.getSettings();
  });
  ipcMain.handle(
    IPC_CHANNELS.saveTrackpadZoomSpeed,
    async (event, speed: TrackpadZoomSpeed) => {
      requireShellOrProjectRendererSender(event.sender);
      if (!canvasInteractionSettingsController) {
        throw new Error("Canvas interaction settings are not ready.");
      }
      return canvasInteractionSettingsController.saveTrackpadZoomSpeed(speed);
    },
  );
};

const hasActiveReadyProject = () => {
  const state = projectViewRegistry?.snapshot();
  return Boolean(
    state?.activeProjectPath &&
      state.projects.some(
        (project) =>
          project.projectPath === state.activeProjectPath &&
          project.status === "ready",
      ),
  );
};

const buildMenu = () =>
  Menu.buildFromTemplate(
    createAppMenuTemplate(
      sendMenuAction,
      currentRecentProjects,
      DESKTOP_APP_VERSION,
      {
        platform: process.platform,
        locale: DESKTOP_LANG_CODE,
        projectActionsEnabled: hasActiveReadyProject(),
      },
    ),
  );

const loadProjectRenderer = async (
  targetWebContents: WebContents,
  projectPath: string,
) => {
  if (rendererUrl) {
    await targetWebContents.loadURL(
      buildDesktopProjectRendererUrl(rendererUrl, projectPath),
    );
    return;
  }
  await targetWebContents.loadFile(
    path.join(__dirname, "..", "dist", "index.html"),
    {
      query: {
        desktopMode: "project",
        projectPath,
      },
    },
  );
};

const createProjectViewRegistryForWindow = (targetWindow: BrowserWindow) =>
  createProjectViewRegistry({
    createView: (descriptor) => {
      const view = new WebContentsView({
        webPreferences: {
          backgroundThrottling: false,
          contextIsolation: true,
          nodeIntegration: false,
          partition: createProjectRendererPartition(descriptor.projectId),
          preload: path.join(__dirname, "preload.js"),
        },
      });
      const projectWebContents = view.webContents;
      const projectWebContentsId = projectWebContents.id;
      const projectRendererLifecycle = createProjectRendererLifecycle({
        webContentsId: projectWebContentsId,
        releaseSessions: releaseProjectRendererRoomSessions,
        markCrashed: (webContentsId) => {
          projectViewRegistry?.markCrashed(webContentsId);
        },
      });
      configureProjectRendererPermissions(projectWebContents);
      registerDesktopEditShortcuts(projectWebContents);
      view.setVisible(false);
      view.setBounds(getProjectViewBounds(targetWindow));
      view.setBackgroundColor("#f5f3ef");

      const resetZoom = () => {
        if (projectWebContents.isDestroyed()) {
          return;
        }
        projectWebContents.setZoomFactor(1);
        void projectWebContents
          .setVisualZoomLevelLimits(1, 1)
          .catch(() => undefined);
      };
      resetZoom();
      projectWebContents.on("zoom-changed", (event) => {
        event.preventDefault();
        resetZoom();
      });
      projectWebContents.on("did-finish-load", resetZoom);
      projectWebContents.on(
        "console-message",
        (_event, level, message, line, sourceId) => {
          console.log(
            `[project-renderer:${descriptor.projectPath}:${level}] ${message}${
              sourceId ? ` (${sourceId}:${line})` : ""
            }`,
          );
        },
      );
      projectWebContents.on("render-process-gone", (_event, details) => {
        console.error("[project-renderer:gone]", {
          projectPath: descriptor.projectPath,
          details,
        });
        projectRendererLifecycle.markUnavailable();
      });
      projectWebContents.on("unresponsive", () => {
        console.error("[project-renderer:unresponsive]", {
          projectPath: descriptor.projectPath,
        });
      });
      projectWebContents.on(
        "did-fail-load",
        (_event, errorCode, errorDescription, validatedURL) => {
          console.error("[project-renderer:load-failed]", {
            projectPath: descriptor.projectPath,
            errorCode,
            errorDescription,
            validatedURL,
          });
        },
      );
      projectWebContents.once("destroyed", () => {
        projectRendererLifecycle.release();
      });
      void loadProjectRenderer(
        projectWebContents,
        descriptor.projectPath,
      ).catch((error) => {
        console.error("[project-renderer:load-error]", {
          projectPath: descriptor.projectPath,
          error,
        });
        projectRendererLifecycle.markUnavailable();
      });

      const handleLifecycle = createProjectViewHandleLifecycle({
        isHostDestroyed: () => targetWindow.isDestroyed(),
        isContentsDestroyed: () => projectWebContents.isDestroyed(),
        attachView: () => {
          targetWindow.contentView.addChildView(view);
        },
        detachView: () => {
          targetWindow.contentView.removeChildView(view);
        },
        setVisible: (visible) => {
          view.setVisible(visible);
        },
        focusContents: () => {
          projectWebContents.focus();
        },
        setBounds: (bounds) => {
          view.setBounds(bounds);
        },
        closeContents: () => {
          projectWebContents.close({ waitForBeforeUnload: false });
        },
      });

      return {
        projectPath: descriptor.projectPath,
        webContentsId: projectWebContentsId,
        ...handleLifecycle,
      };
    },
    onChange: publishProjectViewsState,
  });

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
    title: desktopWindowTitle,
    ...(process.platform === "darwin"
      ? {
          titleBarStyle: "hiddenInset" as const,
          trafficLightPosition: { x: 16, y: 16 },
        }
      : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  projectViewRegistry = createProjectViewRegistryForWindow(mainWindow);
  projectRoomSenderBindings = createProjectRoomSenderBindings({
    requireProjectSender: (senderId, projectPath) =>
      getProjectViewRegistry().requireSenderProject(senderId, projectPath),
  });
  configureRendererPermissions(mainWindow);
  registerDesktopEditShortcuts(mainWindow.webContents);
  disableRendererPageZoom(mainWindow);
  mainWindow.on("resize", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    projectViewRegistry?.setBounds(getProjectViewBounds(mainWindow));
  });
  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    mainWindow?.setTitle(desktopWindowTitle);
  });

  mainWindow.on("close", (event) => {
    const targetWindow = mainWindow;
    if (!targetWindow || allowWindowClose) {
      return;
    }

    event.preventDefault();
    void closeWindowAfterProjectRoomFlush(targetWindow);
  });

  mainWindow.on("closed", () => {
    projectViewRegistry?.closeAll();
    projectViewRegistry = null;
    projectRoomSenderBindings = null;
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
    await mainWindow.loadURL(buildDesktopShellRendererUrl(rendererUrl));
    if (shouldOpenDevTools()) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    await mainWindow.loadFile(
      path.join(__dirname, "..", "dist", "index.html"),
      {
        query: {
          desktopMode: "shell",
        },
      },
    );
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
    await writeDesktopStartupIdentity(desktopStartupIdentity);
    console.log(
      `[corestudio:runtime-identity] ${JSON.stringify(desktopStartupIdentity)}`,
    );
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
    canvasInteractionSettingsController =
      createCanvasInteractionSettingsController({
        store: createCanvasInteractionSettingsStore({
          settingsPath: path.join(
            app.getPath("userData"),
            "canvas-interaction-settings.json",
          ),
        }),
        onSettingsChanged: publishCanvasInteractionSettings,
      });
    await canvasInteractionSettingsController.initialize();
    appUpdateService = createAppUpdateService({
      currentVersion: DESKTOP_APP_VERSION,
      currentSystemVersion: process.getSystemVersion(),
      statePath: path.join(app.getPath("userData"), "app-update-state.json"),
      onAvailabilityChanged: publishAppUpdateAvailability,
    });
    await appUpdateService.initialize();
    modelCatalogService = createModelCatalogService({
      appVersion: DESKTOP_APP_VERSION,
      cacheDirectory: path.join(app.getPath("userData"), "model-catalog"),
    });
    const modelCatalog = await modelCatalogService.initialize();
    if (modelCatalog.catalog) {
      await migrateProviderDefaultModels(modelCatalog.catalog.modelAliases);
    }
    stableBoardActorResumeTokenService =
      createStableBoardActorResumeTokenService({
        secret: await loadOrCreateStableBoardActorTokenSecret(
          path.join(app.getPath("userData"), "stable-board-actor-token-secret"),
        ),
      });
    agentAccessEnabled = (
      await loadAgentAccessSettings({
        defaultEnabled: shouldDefaultAgentAccessEnabled(desktopRuntime.mode),
      })
    ).enabled;
    currentRecentProjects = await loadRecentProjects();
    await removeAgentSessionDescriptor(agentSessionPath).catch((error) => {
      console.error("[agent:session-cleanup-failed]", error);
    });
    registerIpcHandlers();
    await createWindow();
    if (process.env.CORESTUDIO_SMOKE_TEST !== "1") {
      void appUpdateService.checkAutomaticallyIfNeeded();
    }
    if (agentAccessEnabled) {
      await startLocalBridge().catch((error) => {
        console.error("[agent:bridge-startup-failed]", error);
      });
    }

    app.on("activate", async () => {
      if (process.env.CORESTUDIO_SMOKE_TEST !== "1") {
        void appUpdateService?.checkAutomaticallyIfNeeded();
      }
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

  void stopLocalBridge({ final: true })
    .then(() =>
      removeDesktopStartupIdentity(desktopIdentityPath, process.pid).catch(
        (error) => {
          console.error("[desktop:identity-cleanup-failed]", error);
        },
      ),
    )
    .finally(() => {
      localBridgeCleanupFinished = true;
      app.quit();
    });
});

app.on("window-all-closed", () => {
  if (quitState.shouldQuitWhenAllWindowsClosed(process.platform)) {
    app.quit();
  }
});
