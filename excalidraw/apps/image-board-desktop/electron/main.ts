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
  type SavePromptInput,
} from "../src/shared/desktopBridgeTypes";
import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  normalizeAgentPermissions,
  type AgentRendererCommandName,
  type AgentRendererCommandResponse,
} from "../src/shared/agentBridgeTypes";
import { PROJECT_FILENAMES } from "../src/shared/projectTypes";
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
import {
  loadProviderSettings,
  saveProviderSettings,
} from "./settingsStore";
import {
  loadRecentProjects,
  rememberRecentProject,
  removeRecentProject,
} from "./recentProjectsStore";
import {
  deleteSavedPrompt,
  loadPromptLibrary,
  markSavedPromptUsed,
  savePrompt,
} from "./promptLibraryStore";
import { DESKTOP_APP_NAME } from "../src/app/copy";
import { DESKTOP_APP_VERSION } from "./appVersion";
import { createAppMenuTemplate } from "./menu";
import { shouldOpenDevTools } from "./devtools";
import { createQuitState } from "./windowLifecycle";
import { disableRendererPageZoom } from "./windowZoomGuard";
import {
  createLocalBridgeServer,
  type LocalBridgeAuthorizeInput,
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

let mainWindow: BrowserWindow | null = null;
let currentRecentProjects: RecentProjectEntry[] = [];
let currentProject: LocalBridgeCurrentProject | null = null;
let latestProjectOpenRequestId = 0;
let latestAutosaveFlushRequestId = 0;
let rendererReady = false;
let allowWindowClose = false;
let localBridgeHandle: LocalBridgeServerHandle | null = null;
let rendererCommandBridge: ReturnType<typeof createRendererCommandBridge> | null =
  null;
let localBridgeCleanupStarted = false;
let localBridgeCleanupFinished = false;
let agentSessionWriteChain: Promise<void> = Promise.resolve();
const quitState = createQuitState();
const agentSessionPath = getAgentSessionPath();
const localBridgeReadToken = randomUUID();
const taskGrantStore = createTaskGrantStore();
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
const DEFAULT_AGENT_GRANT_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_AGENT_GRANT_TTL_SECONDS = 30 * 24 * 60 * 60;

app.setName(DESKTOP_APP_NAME);

const getTargetWindow = (ownerWindow?: BaseWindow | null) => {
  if (ownerWindow instanceof BrowserWindow && !ownerWindow.isDestroyed()) {
    return ownerWindow;
  }
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
};

const isClipboardPermission = (permission: string) =>
  permission === "clipboard-read" ||
  permission === "clipboard-sanitized-write";

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

const getCurrentProject = (): LocalBridgeCurrentProject | null =>
  currentProject ? { ...currentProject } : null;

const getAgentBoardUrl = () => {
  if (!localBridgeHandle || !rendererUrl) {
    return null;
  }

  const url = new URL("/agent-board", rendererUrl);
  url.searchParams.set("bridge", localBridgeHandle.baseUrl);
  url.searchParams.set("token", localBridgeReadToken);
  return url.toString();
};

const getAgentBridgeStatus = (): DesktopAgentBridgeStatus => ({
  ready: Boolean(localBridgeHandle),
  currentProject: getCurrentProject(),
  boardUrl: getAgentBoardUrl(),
});

const shouldSkipAgentSessionWrite = () =>
  localBridgeCleanupStarted || localBridgeCleanupFinished;

const writeCurrentAgentSessionDescriptor = async () => {
  const bridge = localBridgeHandle;
  if (!bridge || shouldSkipAgentSessionWrite()) {
    return;
  }

  const descriptor = {
    protocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
    appName: DESKTOP_APP_NAME,
    appVersion: DESKTOP_APP_VERSION,
    bridge: {
      host: bridge.host,
      port: bridge.port,
      baseUrl: bridge.baseUrl,
    },
    readToken: localBridgeReadToken,
    currentProject: getCurrentProject(),
    updatedAt: new Date().toISOString(),
  } as const;

  agentSessionWriteChain = agentSessionWriteChain
    .catch(() => undefined)
    .then(async () => {
      if (shouldSkipAgentSessionWrite() || localBridgeHandle !== bridge) {
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
    await writeCurrentAgentSessionDescriptor();
  } catch (error) {
    console.error("[agent:session-write-failed]", error);
  }
};

const getGrantTtlSeconds = (ttlSeconds?: number) => {
  if (
    typeof ttlSeconds !== "number" ||
    !Number.isFinite(ttlSeconds) ||
    ttlSeconds <= 0
  ) {
    return DEFAULT_AGENT_GRANT_TTL_SECONDS;
  }
  return Math.min(ttlSeconds, MAX_AGENT_GRANT_TTL_SECONDS);
};

const formatGrantDuration = (ttlSeconds: number) => {
  const totalMinutes = Math.max(1, Math.ceil(ttlSeconds / 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} 天`);
  }
  if (hours > 0) {
    parts.push(`${hours} 小时`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} 分钟`);
  }

  return parts.join(" ");
};

const authorizeLocalBridgeRequest = async (
  input: LocalBridgeAuthorizeInput,
) => {
  const project = getCurrentProject();
  if (!project) {
    throw Object.assign(new Error("当前没有打开 CoreStudio 项目。"), {
      code: "PROJECT_REQUIRED" as const,
    });
  }

  const targetWindow = getTargetWindow();
  if (!targetWindow) {
    throw Object.assign(new Error("CoreStudio 主窗口未就绪。"), {
      code: "APP_NOT_READY" as const,
    });
  }

  const permissions = normalizeAgentPermissions(input.permissions);
  const ttlSeconds = getGrantTtlSeconds(input.ttlSeconds);
  const ttlLabel = formatGrantDuration(ttlSeconds);
  const reason = input.reason?.trim() || "未提供";
  const permissionLabel = permissions.length ? permissions.join(", ") : "无";

  const result = await dialog.showMessageBox(targetWindow, {
    type: "question",
    buttons: ["允许", "取消"],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    message: "允许 Agent 访问当前 CoreStudio 项目？",
    detail: [
      `项目：${project.name}`,
      `路径：${project.projectPath}`,
      `请求权限：${permissionLabel}`,
      `原因：${reason}`,
      `有效期：${ttlLabel}`,
    ].join("\n"),
  });

  if (result.response !== 0) {
    throw Object.assign(new Error("用户已取消 Agent 授权。"), {
      code: "AUTH_DENIED" as const,
    });
  }

  return taskGrantStore.createGrant({
    projectPath: project.projectPath,
    permissions,
    ttlSeconds,
  });
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
  try {
    localBridgeHandle = await createLocalBridgeServer({
      readToken: localBridgeReadToken,
      getCurrentProject,
      renderer: {
        request: (
          command: AgentRendererCommandName,
          payload?: unknown,
        ) => {
          if (!rendererCommandBridge) {
            return Promise.reject(
              new Error("CoreStudio renderer command bridge is not ready"),
            );
          }
          return rendererCommandBridge.request(command, payload);
        },
      },
      grants: taskGrantStore,
      authorize: authorizeLocalBridgeRequest,
    });
    await writeCurrentAgentSessionDescriptor();
    console.log("[agent:bridge-started]", localBridgeHandle.baseUrl);
  } catch (error) {
    const bridge = localBridgeHandle;
    rendererCommandBridge?.dispose();
    rendererCommandBridge = null;
    localBridgeHandle = null;
    if (bridge) {
      await bridge.close().catch((closeError) => {
        console.error("[agent:bridge-close-after-start-failed]", closeError);
      });
    }
    throw error;
  }
};

const stopLocalBridge = async () => {
  localBridgeCleanupStarted = true;
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
  const errorMessage = getErrorMessage(error);
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
    currentRecentProjects = await removeRecentProject(projectPath);
    Menu.setApplicationMenu(buildMenu());
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
    detail: `${getErrorMessage(error)}\n\n建议先取消关闭，确认项目保存后再退出。`,
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
    const shouldClose = await showCloseAfterSaveFailedDialog(targetWindow, error);
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

    if (event.action === "open-project" || event.action === "open-project-safe") {
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

      pendingFlush.reject(
        new Error(response.errorMessage || "项目保存失败。"),
      );
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
    return inspectProjectHealth(input);
  });

  ipcMain.handle(
    IPC_CHANNELS.rebuildProjectThumbnails,
    async (_event, input) => {
      return rebuildProjectThumbnails(input);
    },
  );

  ipcMain.handle(IPC_CHANNELS.cleanProjectCache, async (_event, input) => {
    return cleanProjectCache(input);
  });

  ipcMain.handle(IPC_CHANNELS.persistImageAssets, async (_event, input) => {
    return persistImageAssets(input);
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

  ipcMain.handle(IPC_CHANNELS.loadProviderSettings, async () =>
    loadProviderSettings(),
  );

  ipcMain.handle(
    IPC_CHANNELS.saveProviderSettings,
    async (_event, input: SaveProviderSettingsInput) =>
      saveProviderSettings(input),
  );

  ipcMain.handle(IPC_CHANNELS.loadPromptLibrary, async () =>
    loadPromptLibrary(),
  );

  ipcMain.handle(
    IPC_CHANNELS.savePrompt,
    async (_event, input: SavePromptInput) => savePrompt(input),
  );

  ipcMain.handle(IPC_CHANNELS.deleteSavedPrompt, async (_event, id: string) =>
    deleteSavedPrompt(id),
  );

  ipcMain.handle(IPC_CHANNELS.markSavedPromptUsed, async (_event, id: string) =>
    markSavedPromptUsed(id),
  );

  ipcMain.handle(
    IPC_CHANNELS.generateImages,
    async (_event, input: GenerateImagesInput) => generateImages(input),
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
    void setCurrentProject(null);
  });

  Menu.setApplicationMenu(buildMenu());

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(
      `[renderer:${level}] ${message}${sourceId ? ` (${sourceId}:${line})` : ""}`,
    );
  });
  mainWindow.webContents.on("did-start-loading", () => {
    rendererReady = false;
  });
  mainWindow.webContents.on(
    "render-process-gone",
    (_event, details) => {
      console.error("[renderer:gone]", details);
    },
  );
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

app.whenReady().then(async () => {
  currentRecentProjects = await loadRecentProjects();
  registerIpcHandlers();
  await createWindow();
  await startLocalBridge();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

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

  localBridgeCleanupStarted = true;
  void stopLocalBridge().finally(() => {
    localBridgeCleanupFinished = true;
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (quitState.shouldQuitWhenAllWindowsClosed(process.platform)) {
    app.quit();
  }
});
