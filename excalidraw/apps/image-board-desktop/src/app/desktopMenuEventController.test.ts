import { describe, expect, it, vi } from "vitest";

import {
  createDesktopMenuEventRendererActions,
  runDesktopMenuEventAction,
} from "./desktopMenuEventController";

import type {
  DesktopMenuEvent,
  DesktopProjectBundle,
} from "../shared/desktopBridgeTypes";

const createProject = (projectPath = "/projects/current"): DesktopProjectBundle => ({
  projectPath,
  project: {
    formatVersion: 1,
    appVersion: "test",
    name: "工业设计助手",
    createdAt: "2026-07-05T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      enabled: true,
      token: "project-token",
    },
  },
  sceneJson: "{}",
  imageRecords: {},
});

const createHandlers = () => ({
  createProject: vi.fn(),
  openProject: vi.fn(),
  openRecentProject: vi.fn(),
  beginProjectOpen: vi.fn(() => 42),
  openProjectBundle: vi.fn(),
  handleProjectOpenFailed: vi.fn(),
  repairProjectThumbnails: vi.fn(),
  inspectProjectHealth: vi.fn(),
  cleanProjectCache: vi.fn(),
  importImages: vi.fn(),
  openGenerateDialog: vi.fn(),
  focusProviderSettings: vi.fn(),
  openAppSettings: vi.fn(),
  setAgentBridgeEnabled: vi.fn(),
  revealProject: vi.fn(),
  showAbout: vi.fn(),
});

const runEvent = (
  event: DesktopMenuEvent,
  options: {
    latestOpenRequestId?: number;
    handlers?: ReturnType<typeof createHandlers>;
  } = {},
) => {
  let latestOpenRequestId = options.latestOpenRequestId ?? 0;
  const handlers = options.handlers ?? createHandlers();
  const result = runDesktopMenuEventAction({
    event,
    latestOpenRequestId,
    setLatestOpenRequestId: (nextRequestId) => {
      latestOpenRequestId = nextRequestId;
    },
    handlers,
  });
  return {
    result,
    handlers,
    latestOpenRequestId,
  };
};

describe("runDesktopMenuEventAction", () => {
  it("opens a fresh project bundle and updates the latest menu request id", () => {
    const projectBundle = createProject();

    const { result, handlers, latestOpenRequestId } = runEvent({
      action: "project-opened",
      openRequestId: 3,
      projectBundle,
    });

    expect(result).toEqual({ status: "handled", action: "project-opened" });
    expect(latestOpenRequestId).toBe(3);
    expect(handlers.beginProjectOpen).toHaveBeenCalledTimes(1);
    expect(handlers.openProjectBundle).toHaveBeenCalledWith(projectBundle, 42);
  });

  it("ignores stale project-opened events", () => {
    const { result, handlers, latestOpenRequestId } = runEvent(
      {
        action: "project-opened",
        openRequestId: 1,
        projectBundle: createProject(),
      },
      { latestOpenRequestId: 2 },
    );

    expect(result).toEqual({
      status: "ignored-stale-project-open",
      action: "project-opened",
    });
    expect(latestOpenRequestId).toBe(2);
    expect(handlers.beginProjectOpen).not.toHaveBeenCalled();
    expect(handlers.openProjectBundle).not.toHaveBeenCalled();
  });

  it("routes fresh project open failures to the failure handler", () => {
    const { result, handlers, latestOpenRequestId } = runEvent({
      action: "project-open-failed",
      openRequestId: 4,
      errorMessage: "打不开项目",
    });

    expect(result).toEqual({
      status: "handled",
      action: "project-open-failed",
    });
    expect(latestOpenRequestId).toBe(4);
    expect(handlers.handleProjectOpenFailed).toHaveBeenCalledWith(
      "打不开项目",
    );
  });

  it("routes simple menu actions to their handlers", () => {
    const handlers = createHandlers();

    runEvent({ action: "generate-image" }, { handlers });
    runEvent({ action: "app-settings" }, { handlers });
    runEvent({ action: "set-agent-bridge-enabled", enabled: true }, {
      handlers,
    });

    expect(handlers.openGenerateDialog).toHaveBeenCalledTimes(1);
    expect(handlers.openAppSettings).toHaveBeenCalledTimes(1);
    expect(handlers.setAgentBridgeEnabled).toHaveBeenCalledWith(true);
  });

  it("ignores recent-project events without a project path", () => {
    const { result, handlers } = runEvent({
      action: "open-recent-project",
      projectPath: null,
    });

    expect(result).toEqual({
      status: "ignored-missing-project-path",
      action: "open-recent-project",
    });
    expect(handlers.openRecentProject).not.toHaveBeenCalled();
  });
});

describe("createDesktopMenuEventRendererActions", () => {
  it("uses the current latest open request id when handling menu events", () => {
    let latestOpenRequestId = 7;
    const handlers = createHandlers();
    const actions = createDesktopMenuEventRendererActions({
      ...handlers,
      getLatestOpenRequestId: () => latestOpenRequestId,
      setLatestOpenRequestId: (requestId) => {
        latestOpenRequestId = requestId;
      },
      projectOpenFailedFallbackMessage: "打开项目失败",
      setProjectError: vi.fn(),
      clearProjectNotice: vi.fn(),
    });

    const result = actions.handle({
      action: "project-opened",
      openRequestId: 6,
      projectBundle: createProject(),
    });

    expect(result).toEqual({
      status: "ignored-stale-project-open",
      action: "project-opened",
    });
    expect(latestOpenRequestId).toBe(7);
    expect(handlers.openProjectBundle).not.toHaveBeenCalled();
  });

  it("normalizes project open failure UI state in the menu owner", () => {
    let latestOpenRequestId = 0;
    const handlers = createHandlers();
    const setProjectError = vi.fn();
    const clearProjectNotice = vi.fn();
    const actions = createDesktopMenuEventRendererActions({
      ...handlers,
      getLatestOpenRequestId: () => latestOpenRequestId,
      setLatestOpenRequestId: (requestId) => {
        latestOpenRequestId = requestId;
      },
      projectOpenFailedFallbackMessage: "打开项目失败",
      setProjectError,
      clearProjectNotice,
    });

    const result = actions.handle({
      action: "project-open-failed",
      openRequestId: 8,
      errorMessage: null,
    });

    expect(result).toEqual({
      status: "handled",
      action: "project-open-failed",
    });
    expect(latestOpenRequestId).toBe(8);
    expect(setProjectError).toHaveBeenCalledWith("打开项目失败");
    expect(clearProjectNotice).toHaveBeenCalledTimes(1);
    expect(handlers.handleProjectOpenFailed).not.toHaveBeenCalled();
  });
});
