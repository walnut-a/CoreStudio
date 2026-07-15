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
  type DesktopAutosaveFlushResponse,
  type DesktopMenuEvent,
  type DesktopAgentBridgeStatus,
  type DesktopProjectStateChangedPayload,
  type DesktopProjectBundle,
  type RecentProjectEntry,
  type GenerateImagesInput,
  type SaveProviderSettingsInput,
} from "../src/shared/desktopBridgeTypes";
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
import {
  createAcpTaskEvent,
  getSelectedAcpAgent,
  normalizeAcpAgentSettings,
  type AcpAgentSettings,
  type AcpTaskEvent,
  type AcpTaskRequest,
} from "../src/shared/acpTypes";
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
import { loadProviderSettings, saveProviderSettings } from "./settingsStore";
import {
  loadAgentAccessSettings,
  saveAgentAccessSettings,
} from "./agent/agentAccessStore";
import {
  loadRecentProjects,
  rememberRecentProject,
  removeRecentProject,
} from "./recentProjectsStore";
import { DESKTOP_APP_NAME } from "../src/app/copy";
import { DESKTOP_APP_VERSION } from "./appVersion";
import { createAppMenuTemplate } from "./menu";
import {
  createMainProcessErrorReporter,
  installMainProcessErrorHandlers,
} from "./mainProcessErrors";
import { shouldOpenDevTools } from "./devtools";
import { createQuitState } from "./windowLifecycle";
import { disableRendererPageZoom } from "./windowZoomGuard";
import { inspectCodexIntegration } from "./codexIntegrationService";
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
import {
  loadAcpAgentSettings,
  saveAcpAgentSettings,
} from "./acp/acpSettingsStore";
import { startAcpAgentProcess } from "./acp/acpAgentProcess";
import {
  createAcpSessionClient,
  type AcpSessionClient,
} from "./acp/acpSessionClient";
import {
  createAcpRunLogMirrorWriter,
  listAcpRunLogSummaries,
  listAcpThreadSummaries,
  readAcpThread,
  readAcpRunLog,
  type AcpRunLogKind,
  type AcpRunLogWriter,
} from "./acp/acpRunLogStore";

installBrokenPipeConsoleGuard();

let mainWindow: BrowserWindow | null = null;
let currentRecentProjects: RecentProjectEntry[] = [];
let currentProject: LocalBridgeCurrentProject | null = null;
let latestProjectOpenRequestId = 0;
let latestAutosaveFlushRequestId = 0;
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
const quitState = createQuitState();
const agentSessionPath = getAgentSessionPath();
const taskGrantStore = createTaskGrantStore();
const generationRequestController = createGenerationRequestController({
  generateImages,
});
interface ActiveAcpTask {
  client: AcpSessionClient;
  runLog: AcpRunLogWriter;
}

const activeAcpTasks = new Map<string, ActiveAcpTask>();
const AGENT_GENERATE_IMAGES_TIMEOUT_MS = 180_000;
const AGENT_BRIDGE_PREFERRED_PORT = 60909;
const PACKAGED_SMOKE_READY_SIGNAL = "[corestudio:smoke-ready]";
const pendingRendererMenuEvents: DesktopMenuEvent[] = [];
const pendingAutosaveFlushes = new Map<
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
  if (!localBridgeHandle || !rendererUrl || !agentAccessEnabled) {
    return null;
  }

  const url = new URL("/agent-board", rendererUrl);
  url.searchParams.set("bridge", localBridgeHandle.baseUrl);
  return url.toString();
};

const getAgentBridgeStatus = (): DesktopAgentBridgeStatus => ({
  enabled: agentAccessEnabled,
  ready: Boolean(localBridgeHandle),
  currentProject: getCurrentProject(),
  boardUrl: getAgentBoardUrl(),
});

const getAcpRunLogBaseDir = () =>
  path.join(app.getPath("appData"), "Excalidraw Image Board", "agent-runs");

const getProjectAcpRunLogBaseDir = (projectPath: string) =>
  path.join(projectPath, PROJECT_FILENAMES.exportsDir, "agent-runs");

const createNoopAcpRunLogWriter = (taskId: string): AcpRunLogWriter => ({
  taskId,
  threadId: taskId,
  logPath: "",
  async append() {
    // no-op: task execution should not fail because diagnostic logging failed
  },
  async finish() {
    // no-op
  },
});

const createAcpTaskRunLog = async (
  request: AcpTaskRequest,
  agentName: string,
): Promise<AcpRunLogWriter> => {
  try {
    return await createAcpRunLogMirrorWriter(
      {
        taskId: request.taskId,
        threadId: request.threadId || request.taskId,
        projectToken: request.project.token,
        projectName: request.project.name,
        agentName,
        userPrompt: request.userPrompt,
      },
      {
        baseDirs: [
          getProjectAcpRunLogBaseDir(request.project.projectPath),
          getAcpRunLogBaseDir(),
        ],
      },
    );
  } catch (error) {
    console.error("[acp:run-log-create-failed]", error);
    return createNoopAcpRunLogWriter(request.taskId);
  }
};

const getAcpTaskLogKind = (taskEvent: AcpTaskEvent): AcpRunLogKind => {
  if (taskEvent.type === "agent-message") {
    return "agent.message";
  }
  if (taskEvent.type === "tool") {
    return taskEvent.status === "pending" ? "tool.call" : "tool.update";
  }
  return taskEvent.type;
};

const appendAcpRunLog = (
  runLog: AcpRunLogWriter,
  kind: AcpRunLogKind,
  payload: unknown,
) => {
  void runLog.append(kind, payload).catch((error) => {
    console.error("[acp:run-log-append-failed]", error);
  });
};

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
    await cancelAllAcpAgentTasks();
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

const sendAcpTaskEvent = (taskEvent: AcpTaskEvent) => {
  const targetWindow = getTargetWindow();
  if (!targetWindow || targetWindow.webContents.isDestroyed()) {
    return;
  }
  targetWindow.webContents.send(IPC_CHANNELS.acpAgentTaskEvent, taskEvent);
};

const getAcpAgentForTask = (settings: AcpAgentSettings, agentId: string) => {
  const normalizedSettings = normalizeAcpAgentSettings(settings);
  if (!normalizedSettings.enabled) {
    return null;
  }

  if (agentId.trim()) {
    return (
      normalizedSettings.agents.find((agent) => agent.id === agentId.trim()) ??
      null
    );
  }

  return getSelectedAcpAgent(normalizedSettings);
};

const validateAcpTaskRequest = (request: AcpTaskRequest) => {
  if (!request || typeof request !== "object") {
    throw new Error("ACP task request is required.");
  }
  if (!request.taskId?.trim()) {
    throw new Error("ACP task id is required.");
  }
  if (!request.userPrompt?.trim()) {
    throw new Error("ACP task prompt is required.");
  }
};

const startAcpAgentTask = async (request: AcpTaskRequest) => {
  validateAcpTaskRequest(request);

  if (activeAcpTasks.has(request.taskId)) {
    throw new Error("ACP task is already running.");
  }
  if (!agentAccessEnabled || !localBridgeHandle) {
    throw new Error("请先在应用设置中开启 Agent 调用。");
  }

  const settings = await loadAcpAgentSettings();
  const agent = getAcpAgentForTask(settings, request.agentId);
  if (!agent) {
    throw new Error("请先配置可用的 ACP Agent。");
  }

  const runLog = await createAcpTaskRunLog(request, agent.name);
  appendAcpRunLog(runLog, "task.package", request);
  const emitTaskEvent = (taskEvent: AcpTaskEvent) => {
    sendAcpTaskEvent(taskEvent);
    appendAcpRunLog(runLog, getAcpTaskLogKind(taskEvent), taskEvent);
  };

  emitTaskEvent(
    createAcpTaskEvent({
      taskId: request.taskId,
      type: "status",
      status: "connecting",
      message: "正在连接 ACP Agent",
      ...(runLog.logPath ? { logPath: runLog.logPath } : {}),
    }),
  );

  let acpProcess: Awaited<ReturnType<typeof startAcpAgentProcess>>;
  try {
    acpProcess = await startAcpAgentProcess(agent, {
      onTraffic: (traffic) => {
        appendAcpRunLog(
          runLog,
          traffic.type === "request"
            ? "acp.request"
            : traffic.type === "response"
              ? "acp.response"
              : "acp.notification",
          traffic,
        );
      },
      onStderrLine: (line) => {
        appendAcpRunLog(runLog, "stderr", { line });
      },
      onExit: (code, signal) => {
        appendAcpRunLog(runLog, "status", {
          status: "process-exited",
          code,
          signal,
        });
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitTaskEvent(
      createAcpTaskEvent({
        taskId: request.taskId,
        type: "error",
        code: "ACP_AGENT_START_FAILED",
        message,
      }),
    );
    emitTaskEvent(
      createAcpTaskEvent({
        taskId: request.taskId,
        type: "status",
        status: "failed",
        message: "ACP Agent 启动失败",
      }),
    );
    await runLog.finish("failed", { errorMessage: message }).catch(
      (logError) => {
        console.error("[acp:run-log-finish-failed]", logError);
      },
    );
    throw error;
  }
  const client = createAcpSessionClient({
    process: acpProcess,
    clientInfo: {
      name: "corestudio",
      title: DESKTOP_APP_NAME,
      version: DESKTOP_APP_VERSION,
    },
    taskInstructionTemplate: settings.taskInstructionTemplate,
    onEvent: emitTaskEvent,
  });
  const activeTask: ActiveAcpTask = { client, runLog };
  activeAcpTasks.set(request.taskId, activeTask);

  void client
    .runTask(request)
    .then(async (result) => {
      await runLog.finish("completed", {
        lastMessage: "Agent 已完成",
        payload: result,
      }).catch((logError) => {
        console.error("[acp:run-log-finish-failed]", logError);
      });
    })
    .catch((error) => {
      console.error("[acp:task-failed]", error);
      const message = error instanceof Error ? error.message : String(error);
      return runLog.finish("failed", { errorMessage: message }).catch(
        (logError) => {
          console.error("[acp:run-log-finish-failed]", logError);
        },
      );
    })
    .finally(async () => {
      if (activeAcpTasks.get(request.taskId) === activeTask) {
        activeAcpTasks.delete(request.taskId);
      }
      await client.dispose().catch((error) => {
        console.error("[acp:task-cleanup-failed]", error);
      });
    });

  return { taskId: request.taskId, threadId: runLog.threadId };
};

const cancelAcpAgentTask = async (taskId: string) => {
  const activeTask = activeAcpTasks.get(taskId);
  if (!activeTask) {
    return;
  }
  activeAcpTasks.delete(taskId);
  try {
    activeTask.client.cancelTask(taskId);
    await activeTask.runLog
      .finish("cancelled", { lastMessage: "已取消" })
      .catch((error) => {
        console.error("[acp:run-log-finish-failed]", error);
      });
  } finally {
    await activeTask.client.dispose().catch((error) => {
      console.error("[acp:task-cancel-cleanup-failed]", error);
    });
  }
};

const cancelAllAcpAgentTasks = async () => {
  await Promise.all(
    [...activeAcpTasks.keys()].map((taskId) => cancelAcpAgentTask(taskId)),
  );
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

const requestRendererAutosaveFlush = (
  targetWindow: BrowserWindow,
  timeoutMs = 5000,
) =>
  new Promise<void>((resolve, reject) => {
    if (targetWindow.isDestroyed() || targetWindow.webContents.isDestroyed()) {
      reject(new Error("窗口已经关闭，无法完成项目保存。"));
      return;
    }

    const requestId = ++latestAutosaveFlushRequestId;
    const timeout = setTimeout(() => {
      pendingAutosaveFlushes.delete(requestId);
      reject(new Error("等待项目保存超时。"));
    }, timeoutMs);

    pendingAutosaveFlushes.set(requestId, {
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

    targetWindow.webContents.send(IPC_CHANNELS.flushAutosaveRequest, {
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

const closeWindowAfterAutosave = async (targetWindow: BrowserWindow) => {
  try {
    await requestRendererAutosaveFlush(targetWindow);
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

  ipcMain.handle(IPC_CHANNELS.loadAcpAgentSettings, async () =>
    loadAcpAgentSettings(),
  );

  ipcMain.handle(IPC_CHANNELS.saveAcpAgentSettings, async (_event, settings) =>
    saveAcpAgentSettings(settings),
  );

  ipcMain.handle(
    IPC_CHANNELS.startAcpAgentTask,
    async (_event, request: AcpTaskRequest) => startAcpAgentTask(request),
  );

  ipcMain.handle(
    IPC_CHANNELS.cancelAcpAgentTask,
    async (_event, taskId: string) => cancelAcpAgentTask(taskId),
  );

  ipcMain.handle(IPC_CHANNELS.listAcpAgentRunLogs, async (_event, input) =>
    listAcpRunLogSummaries({
      baseDir: getAcpRunLogBaseDir(),
      limit:
        input &&
        typeof input === "object" &&
        "limit" in input &&
        typeof input.limit === "number"
          ? input.limit
          : undefined,
    }),
  );

  ipcMain.handle(IPC_CHANNELS.readAcpAgentRunLog, async (_event, taskId) => {
    if (typeof taskId !== "string" || !taskId.trim()) {
      throw new Error("ACP run log taskId is required.");
    }

    return readAcpRunLog(taskId, {
      baseDir: getAcpRunLogBaseDir(),
    });
  });

  ipcMain.handle(IPC_CHANNELS.listAcpAgentThreads, async (_event, input) =>
    listAcpThreadSummaries({
      baseDir: getAcpRunLogBaseDir(),
      projectToken:
        input &&
        typeof input === "object" &&
        "projectToken" in input &&
        typeof input.projectToken === "string"
          ? input.projectToken
          : undefined,
      limit:
        input &&
        typeof input === "object" &&
        "limit" in input &&
        typeof input.limit === "number"
          ? input.limit
          : undefined,
    }),
  );

  ipcMain.handle(IPC_CHANNELS.readAcpAgentThread, async (_event, threadId) => {
    if (typeof threadId !== "string" || !threadId.trim()) {
      throw new Error("ACP thread id is required.");
    }

    return readAcpThread(threadId, {
      baseDir: getAcpRunLogBaseDir(),
    });
  });

  ipcMain.on(
    IPC_CHANNELS.flushAutosaveResponse,
    (_event, response: DesktopAutosaveFlushResponse) => {
      const pendingFlush = pendingAutosaveFlushes.get(response.requestId);
      if (!pendingFlush) {
        return;
      }

      pendingAutosaveFlushes.delete(response.requestId);
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

  ipcMain.handle(IPC_CHANNELS.writeProjectScene, async (_event, input) => {
    return writeProjectScene(input);
  });

  ipcMain.handle(
    IPC_CHANNELS.readProjectAssetPayloads,
    async (_event, input) => {
      return readProjectAssetPayloads(input);
    },
  );

  ipcMain.handle(IPC_CHANNELS.inspectProjectHealth, async (_event, input) => {
    return inspectProjectHealth({
      ...input,
      agentRunsBaseDir: getAcpRunLogBaseDir(),
    });
  });

  ipcMain.handle(
    IPC_CHANNELS.rebuildProjectThumbnails,
    async (_event, input) => {
      return rebuildProjectThumbnails({
        ...input,
        agentRunsBaseDir: getAcpRunLogBaseDir(),
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

  ipcMain.handle(IPC_CHANNELS.inspectCodexIntegration, async () =>
    inspectCodexIntegration({
      homeDir: app.getPath("home"),
      resourcesPath: process.resourcesPath,
      appVersion: DESKTOP_APP_VERSION,
      electronPath: process.execPath,
    }),
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
    void closeWindowAfterAutosave(targetWindow);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    rendererReady = false;
    void cancelAllAcpAgentTasks();
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

  void Promise.all([
    cancelAllAcpAgentTasks(),
    stopLocalBridge({ final: true }),
  ]).finally(() => {
    localBridgeCleanupFinished = true;
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (quitState.shouldQuitWhenAllWindowsClosed(process.platform)) {
    app.quit();
  }
});
