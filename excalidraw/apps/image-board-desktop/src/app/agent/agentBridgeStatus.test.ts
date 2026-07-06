import { describe, expect, it, vi } from "vitest";

import {
  canReadAgentBridgeStatus,
  canSetAgentBridgeEnabled,
  createUnavailableAgentBridgeStatus,
  buildAgentBridgeProjectAccessUpdate,
  buildAgentBridgeStatusCurrentProjectUpdate,
  buildDesktopCurrentProject,
  getProjectAgentAccessToken,
  notifyAgentBridgeProjectState,
  readAgentBridgeStatus,
  refreshAgentBridgeStatus,
  runAgentBridgeEnabledToggle,
  setAgentBridgeEnabledState,
} from "./agentBridgeStatus";

import type {
  DesktopAgentBridgeStatus,
  DesktopCurrentProject,
  DesktopProjectBundle,
} from "../../shared/desktopBridgeTypes";

const createStatus = (
  patch: Partial<DesktopAgentBridgeStatus> = {},
): DesktopAgentBridgeStatus => ({
  enabled: true,
  ready: true,
  currentProject: {
    name: "工业设计助手",
    projectPath: "/Users/example/CoreStudio/工业设计助手",
    agentAccess: {
      enabled: true,
      token: "project-token",
    },
  },
  boardUrl: "http://127.0.0.1:5174/agent-board?projectToken=project-token",
  ...patch,
});

const createCurrentProject = (): DesktopCurrentProject => ({
  name: "工业设计助手",
  projectPath: "/Users/example/CoreStudio/工业设计助手",
  agentAccess: {
    enabled: true,
    token: "project-token",
  },
});

const createProjectBundle = (): DesktopProjectBundle => ({
  projectPath: "/Users/example/CoreStudio/工业设计助手",
  project: {
    formatVersion: 1,
    appVersion: "test",
    name: "工业设计助手",
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      enabled: false,
      token: "old-token",
    },
  },
  sceneJson: "{}",
  imageRecords: {},
});

describe("createUnavailableAgentBridgeStatus", () => {
  it("builds a disabled fallback status with the optional board URL", () => {
    expect(
      createUnavailableAgentBridgeStatus(
        "http://127.0.0.1:5174/agent-board?projectToken=project-token",
      ),
    ).toEqual({
      enabled: false,
      ready: false,
      currentProject: null,
      boardUrl: "http://127.0.0.1:5174/agent-board?projectToken=project-token",
    });
  });

  it("uses a null board URL outside the Agent Board route", () => {
    expect(createUnavailableAgentBridgeStatus(null).boardUrl).toBeNull();
  });
});

describe("readAgentBridgeStatus", () => {
  it("returns null when the desktop bridge cannot read Agent Bridge status", async () => {
    await expect(
      readAgentBridgeStatus({
        bridge: {},
        fallbackBoardUrl: "http://127.0.0.1:5174/agent-board",
      }),
    ).resolves.toBeNull();
  });

  it("returns the current status from the desktop bridge", async () => {
    const status = createStatus();

    await expect(
      readAgentBridgeStatus({
        bridge: {
          getAgentBridgeStatus: vi.fn(async () => status),
        },
        fallbackBoardUrl: null,
      }),
    ).resolves.toBe(status);
  });

  it("falls back to an unavailable status when the bridge read fails", async () => {
    await expect(
      readAgentBridgeStatus({
        bridge: {
          getAgentBridgeStatus: vi.fn(async () => {
            throw new Error("bridge offline");
          }),
        },
        fallbackBoardUrl: "http://127.0.0.1:5174/agent-board",
      }),
    ).resolves.toEqual({
      enabled: false,
      ready: false,
      currentProject: null,
      boardUrl: "http://127.0.0.1:5174/agent-board",
    });
  });
});

describe("canReadAgentBridgeStatus", () => {
  it("reports whether the desktop bridge can read Agent Bridge status", () => {
    expect(canReadAgentBridgeStatus(null)).toBe(false);
    expect(canReadAgentBridgeStatus({})).toBe(false);
    expect(
      canReadAgentBridgeStatus({
        getAgentBridgeStatus: vi.fn(),
      }),
    ).toBe(true);
  });
});

describe("buildDesktopCurrentProject", () => {
  it("returns null when there is no open project", () => {
    expect(buildDesktopCurrentProject(null)).toBeNull();
  });

  it("maps the current project bundle to the desktop bridge payload", () => {
    const project = createProjectBundle();

    expect(buildDesktopCurrentProject(project)).toEqual({
      name: "工业设计助手",
      projectPath: "/Users/example/CoreStudio/工业设计助手",
      agentAccess: {
        enabled: false,
        token: "old-token",
      },
    });
  });
});

describe("getProjectAgentAccessToken", () => {
  it("returns null when there is no open project", () => {
    expect(getProjectAgentAccessToken(null)).toBeNull();
  });

  it("returns the current project Agent access token", () => {
    const project = createProjectBundle();

    expect(getProjectAgentAccessToken(project)).toBe("old-token");
  });
});

describe("buildAgentBridgeStatusCurrentProjectUpdate", () => {
  it("keeps a null status when Agent Bridge status has not been loaded", () => {
    expect(
      buildAgentBridgeStatusCurrentProjectUpdate({
        status: null,
        project: createProjectBundle(),
      }),
    ).toBeNull();
  });

  it("updates the status current project from the project bundle", () => {
    expect(
      buildAgentBridgeStatusCurrentProjectUpdate({
        status: createStatus({ currentProject: null }),
        project: createProjectBundle(),
      }),
    ).toMatchObject({
      currentProject: {
        name: "工业设计助手",
        projectPath: "/Users/example/CoreStudio/工业设计助手",
        agentAccess: {
          enabled: false,
          token: "old-token",
        },
      },
    });
  });

  it("clears the status current project when there is no open project", () => {
    expect(
      buildAgentBridgeStatusCurrentProjectUpdate({
        status: createStatus(),
        project: null,
      })?.currentProject,
    ).toBeNull();
  });
});

describe("notifyAgentBridgeProjectState", () => {
  it("does nothing when the bridge cannot be notified", () => {
    expect(() =>
      notifyAgentBridgeProjectState({
        bridge: null,
        currentProject: createProjectBundle(),
      }),
    ).not.toThrow();
  });

  it("notifies the desktop bridge with the current project payload", () => {
    const notifyProjectStateChanged = vi.fn();
    const project = createProjectBundle();

    notifyAgentBridgeProjectState({
      bridge: { notifyProjectStateChanged },
      currentProject: project,
    });

    expect(notifyProjectStateChanged).toHaveBeenCalledWith(
      buildDesktopCurrentProject(project),
    );
  });
});

describe("refreshAgentBridgeStatus", () => {
  it("returns null without notifying project state when the bridge cannot read status", async () => {
    const notifyProjectStateChanged = vi.fn();

    await expect(
      refreshAgentBridgeStatus({
        bridge: { notifyProjectStateChanged },
        currentProject: createProjectBundle(),
        fallbackBoardUrl: "http://127.0.0.1:5174/agent-board",
      }),
    ).resolves.toBeNull();
    expect(notifyProjectStateChanged).not.toHaveBeenCalled();
  });

  it("notifies current project before reading Agent Bridge status", async () => {
    const currentProject = createProjectBundle();
    const status = createStatus();
    const notifyProjectStateChanged = vi.fn();
    const getAgentBridgeStatus = vi.fn(async () => status);

    await expect(
      refreshAgentBridgeStatus({
        bridge: {
          notifyProjectStateChanged,
          getAgentBridgeStatus,
        },
        currentProject,
        fallbackBoardUrl: null,
      }),
    ).resolves.toBe(status);
    expect(notifyProjectStateChanged).toHaveBeenCalledWith({
      name: "工业设计助手",
      projectPath: "/Users/example/CoreStudio/工业设计助手",
      agentAccess: {
        enabled: false,
        token: "old-token",
      },
    });
    expect(getAgentBridgeStatus).toHaveBeenCalled();
  });

  it("keeps the fallback unavailable status when the bridge read fails", async () => {
    await expect(
      refreshAgentBridgeStatus({
        bridge: {
          notifyProjectStateChanged: vi.fn(),
          getAgentBridgeStatus: vi.fn(async () => {
            throw new Error("bridge offline");
          }),
        },
        currentProject: null,
        fallbackBoardUrl: "http://127.0.0.1:5174/agent-board",
      }),
    ).resolves.toEqual({
      enabled: false,
      ready: false,
      currentProject: null,
      boardUrl: "http://127.0.0.1:5174/agent-board",
    });
  });
});

describe("canSetAgentBridgeEnabled", () => {
  it("reports whether the desktop bridge can toggle Agent Bridge", () => {
    expect(canSetAgentBridgeEnabled(null)).toBe(false);
    expect(canSetAgentBridgeEnabled({})).toBe(false);
    expect(
      canSetAgentBridgeEnabled({
        setAgentBridgeEnabled: vi.fn(),
      }),
    ).toBe(true);
  });
});

describe("setAgentBridgeEnabledState", () => {
  it("throws a product-facing error when the desktop bridge cannot toggle Agent Bridge", async () => {
    await expect(
      setAgentBridgeEnabledState({
        bridge: {},
        enabled: true,
      }),
    ).rejects.toThrow("请在 CoreStudio 桌面端开启或关闭 Agent 连接。");
  });

  it("returns the updated Agent Bridge status from the desktop bridge", async () => {
    const status = createStatus({ enabled: false, ready: false });
    const setAgentBridgeEnabled = vi.fn(async () => status);

    await expect(
      setAgentBridgeEnabledState({
        bridge: { setAgentBridgeEnabled },
        enabled: false,
      }),
    ).resolves.toBe(status);
    expect(setAgentBridgeEnabled).toHaveBeenCalledWith(false);
  });

  it("propagates desktop bridge toggle failures", async () => {
    const error = new Error("toggle failed");

    await expect(
      setAgentBridgeEnabledState({
        bridge: {
          setAgentBridgeEnabled: vi.fn(async () => {
            throw error;
          }),
        },
        enabled: true,
      }),
    ).rejects.toBe(error);
  });
});

describe("buildAgentBridgeProjectAccessUpdate", () => {
  it("updates the open project agent access from the toggled bridge status", () => {
    const currentProject = createProjectBundle();
    const nextStatus = createStatus({
      currentProject: {
        name: "工业设计助手",
        projectPath: currentProject.projectPath,
        agentAccess: {
          enabled: true,
          token: "new-token",
        },
      },
    });

    expect(
      buildAgentBridgeProjectAccessUpdate({
        currentProject,
        nextStatus,
      }),
    ).toEqual({
      ...currentProject,
      project: {
        ...currentProject.project,
        agentAccess: {
          enabled: true,
          token: "new-token",
        },
      },
    });
  });

  it("does not update when either side has no current project", () => {
    expect(
      buildAgentBridgeProjectAccessUpdate({
        currentProject: null,
        nextStatus: createStatus(),
      }),
    ).toBeNull();

    expect(
      buildAgentBridgeProjectAccessUpdate({
        currentProject: createProjectBundle(),
        nextStatus: createStatus({ currentProject: null }),
      }),
    ).toBeNull();
  });
});

describe("runAgentBridgeEnabledToggle", () => {
  it("notifies the current project, toggles the bridge, and returns project access updates", async () => {
    const currentProject = createProjectBundle();
    const nextStatus = createStatus({
      currentProject: {
        name: "工业设计助手",
        projectPath: currentProject.projectPath,
        agentAccess: {
          enabled: true,
          token: "fresh-token",
        },
      },
    });
    const notifyProjectStateChanged = vi.fn();
    const setAgentBridgeEnabled = vi.fn(async () => nextStatus);

    await expect(
      runAgentBridgeEnabledToggle({
        bridge: {
          notifyProjectStateChanged,
          setAgentBridgeEnabled,
        },
        enabled: true,
        currentProject,
      }),
    ).resolves.toEqual({
      status: "updated",
      nextStatus,
      projectUpdate: {
        ...currentProject,
        project: {
          ...currentProject.project,
          agentAccess: {
            enabled: true,
            token: "fresh-token",
          },
        },
      },
    });

    expect(notifyProjectStateChanged).toHaveBeenCalledWith(
      buildDesktopCurrentProject(currentProject),
    );
    expect(setAgentBridgeEnabled).toHaveBeenCalledWith(true);
  });

  it("returns a product error when the bridge cannot toggle Agent access", async () => {
    await expect(
      runAgentBridgeEnabledToggle({
        bridge: null,
        enabled: true,
        currentProject: createProjectBundle(),
      }),
    ).resolves.toEqual({
      status: "failed",
      errorMessage: "请在 CoreStudio 桌面端开启或关闭 Agent 连接。",
    });
  });

  it("normalizes unknown bridge toggle failures", async () => {
    await expect(
      runAgentBridgeEnabledToggle({
        bridge: {
          setAgentBridgeEnabled: vi.fn(async () => {
            throw "boom";
          }),
        },
        enabled: false,
        currentProject: createProjectBundle(),
      }),
    ).resolves.toEqual({
      status: "failed",
      errorMessage: "Agent 连接状态切换失败。",
    });
  });
});
