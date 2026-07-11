import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";

import {
  applyAgentBridgeStatusCurrentProjectUpdate,
  createAgentBridgeStatusRendererActions,
  runAgentBridgeEnabledToggleAction,
  runAgentBridgeStatusRefreshAction,
  runAgentBrowserConnectionRefreshAction,
  useAgentBridgeStatusCurrentProjectSyncEffect,
} from "./agentBridgeStatusController";

import type {
  DesktopAgentBridgeStatus,
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

describe("applyAgentBridgeStatusCurrentProjectUpdate", () => {
  it("applies the current project to the loaded local Agent Bridge status", () => {
    const currentProject = createProjectBundle();
    const applyBridgeStatus = vi.fn();

    applyAgentBridgeStatusCurrentProjectUpdate({
      project: currentProject,
      applyBridgeStatus,
    });

    expect(applyBridgeStatus).toHaveBeenCalledTimes(1);
    const updater = applyBridgeStatus.mock.calls[0]?.[0] as (
      status: DesktopAgentBridgeStatus | null,
    ) => DesktopAgentBridgeStatus | null;

    expect(updater(createStatus({ currentProject: null }))).toMatchObject({
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

  it("keeps the local Agent Bridge status unloaded", () => {
    const applyBridgeStatus = vi.fn();

    applyAgentBridgeStatusCurrentProjectUpdate({
      project: createProjectBundle(),
      applyBridgeStatus,
    });

    const updater = applyBridgeStatus.mock.calls[0]?.[0] as (
      status: DesktopAgentBridgeStatus | null,
    ) => DesktopAgentBridgeStatus | null;

    expect(updater(null)).toBeNull();
  });
});

const AgentBridgeStatusCurrentProjectSyncProbe = ({
  project,
  applyBridgeStatus,
}: {
  project: DesktopProjectBundle | null;
  applyBridgeStatus: (
    update: (
      status: DesktopAgentBridgeStatus | null,
    ) => DesktopAgentBridgeStatus | null,
  ) => void;
}) => {
  useAgentBridgeStatusCurrentProjectSyncEffect({
    project,
    applyBridgeStatus,
  });

  return null;
};

describe("useAgentBridgeStatusCurrentProjectSyncEffect", () => {
  it("does not sync bridge status when no project is open", () => {
    const applyBridgeStatus = vi.fn();

    render(
      createElement(AgentBridgeStatusCurrentProjectSyncProbe, {
        project: null,
        applyBridgeStatus,
      }),
    );

    expect(applyBridgeStatus).not.toHaveBeenCalled();
  });

  it("syncs bridge status when the current project changes", () => {
    const applyBridgeStatus = vi.fn();
    const project = createProjectBundle();
    const { rerender } = render(
      createElement(AgentBridgeStatusCurrentProjectSyncProbe, {
        project,
        applyBridgeStatus,
      }),
    );

    expect(applyBridgeStatus).toHaveBeenCalledTimes(1);

    rerender(
      createElement(AgentBridgeStatusCurrentProjectSyncProbe, {
        project: {
          ...project,
          sceneJson: "{\"changed\":true}",
        },
        applyBridgeStatus,
      }),
    );
    expect(applyBridgeStatus).toHaveBeenCalledTimes(1);

    rerender(
      createElement(AgentBridgeStatusCurrentProjectSyncProbe, {
        project: {
          ...project,
          projectPath: "/Users/example/CoreStudio/EDC设计助手",
          project: {
            ...project.project,
            name: "EDC设计助手",
          },
        },
        applyBridgeStatus,
      }),
    );
    expect(applyBridgeStatus).toHaveBeenCalledTimes(2);
  });
});

describe("runAgentBridgeStatusRefreshAction", () => {
  it("clears the local status when the desktop bridge cannot read Agent status", async () => {
    const applyBridgeStatus = vi.fn();

    await expect(
      runAgentBridgeStatusRefreshAction({
        bridge: {},
        currentProject: createProjectBundle(),
        fallbackBoardUrl: "http://127.0.0.1:5174/agent-board",
        applyBridgeStatus,
      }),
    ).resolves.toEqual({
      canReadStatus: false,
      didApply: true,
      nextStatus: null,
    });

    expect(applyBridgeStatus).toHaveBeenCalledWith(null);
  });

  it("notifies the open project, reads bridge status, and applies it", async () => {
    const currentProject = createProjectBundle();
    const status = createStatus();
    const applyBridgeStatus = vi.fn();
    const notifyProjectStateChanged = vi.fn();
    const getAgentBridgeStatus = vi.fn(async () => status);

    await expect(
      runAgentBridgeStatusRefreshAction({
        bridge: {
          notifyProjectStateChanged,
          getAgentBridgeStatus,
        },
        currentProject,
        fallbackBoardUrl: null,
        applyBridgeStatus,
      }),
    ).resolves.toEqual({
      canReadStatus: true,
      didApply: true,
      nextStatus: status,
    });

    expect(notifyProjectStateChanged).toHaveBeenCalledWith({
      name: "工业设计助手",
      projectPath: "/Users/example/CoreStudio/工业设计助手",
      agentAccess: {
        enabled: false,
        token: "old-token",
      },
    });
    expect(applyBridgeStatus).toHaveBeenCalledWith(status);
  });

  it("does not apply stale async results after the caller is cancelled", async () => {
    const status = createStatus();
    const applyBridgeStatus = vi.fn();

    await expect(
      runAgentBridgeStatusRefreshAction({
        bridge: {
          getAgentBridgeStatus: vi.fn(async () => status),
        },
        currentProject: null,
        fallbackBoardUrl: null,
        applyBridgeStatus,
        canApply: () => false,
      }),
    ).resolves.toEqual({
      canReadStatus: true,
      didApply: false,
      nextStatus: status,
    });

    expect(applyBridgeStatus).not.toHaveBeenCalled();
  });
});

describe("runAgentBrowserConnectionRefreshAction", () => {
  it("refreshes desktop startup state and resets auto-open state for a ready Agent Board bridge", async () => {
    const status = createStatus();
    const applyBridgeStatus = vi.fn();
    const resetAutoOpenProjectPath = vi.fn();
    const refreshDesktopStartupState = vi.fn();

    await expect(
      runAgentBrowserConnectionRefreshAction({
        bridge: {
          getAgentBridgeStatus: vi.fn(async () => status),
        },
        currentProject: createProjectBundle(),
        currentProjectPath: "/Users/example/CoreStudio/EDC设计助手",
        fallbackBoardUrl: "http://127.0.0.1:5174/agent-board",
        isAgentBrowserRoute: true,
        applyBridgeStatus,
        resetAutoOpenProjectPath,
        refreshDesktopStartupState,
      }),
    ).resolves.toMatchObject({
      canReadStatus: true,
      didApply: true,
      nextStatus: status,
      refreshPlan: {
        loadDesktopStartupState: true,
        resetAutoOpenProjectPath: true,
      },
    });

    expect(applyBridgeStatus).toHaveBeenCalledWith(status);
    expect(resetAutoOpenProjectPath).toHaveBeenCalledWith(null);
    expect(refreshDesktopStartupState).toHaveBeenCalled();
  });

  it("does not run Agent Board follow-up effects when the status refresh is cancelled", async () => {
    const applyBridgeStatus = vi.fn();
    const resetAutoOpenProjectPath = vi.fn();
    const refreshDesktopStartupState = vi.fn();

    await expect(
      runAgentBrowserConnectionRefreshAction({
        bridge: {
          getAgentBridgeStatus: vi.fn(async () => createStatus()),
        },
        currentProject: null,
        currentProjectPath: null,
        fallbackBoardUrl: "http://127.0.0.1:5174/agent-board",
        isAgentBrowserRoute: true,
        applyBridgeStatus,
        resetAutoOpenProjectPath,
        refreshDesktopStartupState,
        canApply: () => false,
      }),
    ).resolves.toMatchObject({
      canReadStatus: true,
      didApply: false,
    });

    expect(applyBridgeStatus).not.toHaveBeenCalled();
    expect(resetAutoOpenProjectPath).not.toHaveBeenCalled();
    expect(refreshDesktopStartupState).not.toHaveBeenCalled();
  });
});

describe("runAgentBridgeEnabledToggleAction", () => {
  it("applies the toggled bridge status and project access update", async () => {
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
    const applyBridgeStatus = vi.fn();
    const updateCurrentProject = vi.fn();
    const showError = vi.fn();

    await expect(
      runAgentBridgeEnabledToggleAction({
        bridge: {
          setAgentBridgeEnabled: vi.fn(async () => nextStatus),
        },
        enabled: true,
        currentProject,
        applyBridgeStatus,
        updateCurrentProject,
        showError,
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

    expect(applyBridgeStatus).toHaveBeenCalledWith(nextStatus);
    expect(updateCurrentProject).toHaveBeenCalledWith({
      ...currentProject,
      project: {
        ...currentProject.project,
        agentAccess: {
          enabled: true,
          token: "fresh-token",
        },
      },
    });
    expect(showError).not.toHaveBeenCalled();
  });

  it("surfaces bridge toggle failures through the provided error sink", async () => {
    const showError = vi.fn();

    await expect(
      runAgentBridgeEnabledToggleAction({
        bridge: null,
        enabled: true,
        currentProject: createProjectBundle(),
        applyBridgeStatus: vi.fn(),
        updateCurrentProject: vi.fn(),
        showError,
      }),
    ).resolves.toEqual({
      status: "failed",
      errorMessage: "请在 CoreStudio 桌面端开启或关闭 Agent 连接。",
    });

    expect(showError).toHaveBeenCalledWith(
      "请在 CoreStudio 桌面端开启或关闭 Agent 连接。",
    );
  });
});

describe("createAgentBridgeStatusRendererActions", () => {
  it("centralizes Agent Bridge status refresh, Agent Board refresh, and enabled toggle wiring", async () => {
    const currentProject = createProjectBundle();
    const status = createStatus();
    const enabledStatus = createStatus({
      currentProject: {
        name: "工业设计助手",
        projectPath: currentProject.projectPath,
        agentAccess: {
          enabled: true,
          token: "fresh-token",
        },
      },
    });
    const bridge = {
      getAgentBridgeStatus: vi.fn(async () => status),
      notifyProjectStateChanged: vi.fn(),
      setAgentBridgeEnabled: vi.fn(async () => enabledStatus),
    };
    const applyBridgeStatus = vi.fn();
    const resetAutoOpenProjectPath = vi.fn();
    const refreshDesktopStartupState = vi.fn();
    const updateCurrentProject = vi.fn();
    const showError = vi.fn();

    const actions = createAgentBridgeStatusRendererActions({
      getBridge: () => bridge,
      getCurrentProject: () => currentProject,
      getIsAgentBrowserRoute: () => true,
      getFallbackBoardUrl: () => "http://127.0.0.1:5174/agent-board",
      applyBridgeStatus,
      resetAutoOpenProjectPath,
      refreshDesktopStartupState,
      updateCurrentProject,
      showError,
    });

    await expect(actions.loadStatus()).resolves.toBe(status);
    await expect(actions.refreshBrowserConnection()).resolves.toMatchObject({
      canReadStatus: true,
      didApply: true,
      nextStatus: status,
    });
    await expect(actions.refreshBrowserConnectionStatus()).resolves.toBe(
      status,
    );
    await expect(actions.setEnabled(true)).resolves.toEqual({
      status: "updated",
      nextStatus: enabledStatus,
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

    expect(bridge.getAgentBridgeStatus).toHaveBeenCalledTimes(3);
    expect(bridge.notifyProjectStateChanged).toHaveBeenCalledTimes(4);
    expect(applyBridgeStatus).toHaveBeenCalledWith(status);
    expect(applyBridgeStatus).toHaveBeenCalledWith(enabledStatus);
    expect(refreshDesktopStartupState).toHaveBeenCalledTimes(2);
    expect(resetAutoOpenProjectPath).not.toHaveBeenCalled();
    expect(updateCurrentProject).toHaveBeenCalledWith({
      ...currentProject,
      project: {
        ...currentProject.project,
        agentAccess: {
          enabled: true,
          token: "fresh-token",
        },
      },
    });
    expect(showError).not.toHaveBeenCalled();
  });
});
