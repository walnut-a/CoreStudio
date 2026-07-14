import { describe, expect, it } from "vitest";

import {
  buildAcpAgentGenerationViewModel,
  buildAgentBoardStartupRenderPlan,
  buildAgentBoardStartupViewModel,
  buildAgentBoardCopyAction,
  buildAgentCliEnvironmentExports,
  buildAgentCliEnvironmentCopyAction,
  buildAgentIntegrationRuntimeViewModel,
  buildAgentIntegrationViewModel,
} from "./agentIntegrationViewModel";

import type { AcpAgentSettings } from "../../shared/acpTypes";
import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";

const createBridgeStatus = (
  patch: Partial<DesktopAgentBridgeStatus> = {},
): DesktopAgentBridgeStatus => ({
  enabled: true,
  ready: true,
  currentProject: {
    projectPath: "/tmp/corestudio-project",
    name: "测试项目",
    agentAccess: {
      enabled: true,
      token: "project-token",
    },
  },
  boardUrl:
    "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=project-token",
  ...patch,
});

const createAcpSettings = (
  patch: Partial<AcpAgentSettings> = {},
): AcpAgentSettings => ({
  experimentalEnabled: true,
  enabled: true,
  defaultAgentId: "default",
  agents: [
    {
      id: "default",
      name: "测试 ACP Agent",
      command: "npx",
      args: ["-y", "@agentclientprotocol/codex-acp"],
      cwd: null,
    },
  ],
  ...patch,
});

describe("buildAgentIntegrationViewModel", () => {
  it("represents a disabled bridge as unavailable across dependent surfaces", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus({
        enabled: false,
        ready: false,
        currentProject: null,
        boardUrl: null,
      }),
    });

    expect(viewModel.readiness).toBe("disabled");
    expect(viewModel.collaboration).toEqual({
      status: "disabled",
      statusText: "尚未开启",
      description: "开启后，可在 Codex 中查看当前画布并安全写回结果。",
      projectName: null,
    });
    expect(viewModel.statusText).toBe("Agent 集成已关闭");
    expect(viewModel.badgeText).toBe("关闭");
    expect(viewModel.connected).toBe(false);
    expect(viewModel.bridge.endpointLabel).toBe("未启动");
    expect(viewModel.project.open).toBe(false);
    expect(viewModel.cli.available).toBe(false);
    expect(viewModel.cli.envCopyable).toBe(false);
    expect(viewModel.cli.statusText).toBe("开启连接后可发现");
    expect(viewModel.board.available).toBe(false);
    expect(viewModel.board.statusText).toBe("等待 Board 链接");
  });

  it("normalizes the connected project, bridge endpoint, CLI, and board state", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
    });

    expect(viewModel.readiness).toBe("connected");
    expect(viewModel.collaboration).toEqual({
      status: "ready",
      statusText: "已可用",
      description: "Codex 可以访问当前项目。",
      projectName: "测试项目",
    });
    expect(viewModel.statusText).toBe("Agent 已连接");
    expect(viewModel.badgeText).toBe("在线");
    expect(viewModel.connected).toBe(true);
    expect(viewModel.bridge.endpoint).toBe("http://127.0.0.1:60909");
    expect(viewModel.bridge.endpointLabel).toBe("http://127.0.0.1:60909");
    expect(viewModel.project).toMatchObject({
      open: true,
      name: "测试项目",
      path: "/tmp/corestudio-project",
      token: "project-token",
    });
    expect(viewModel.cli.available).toBe(true);
    expect(viewModel.cli.envCopyable).toBe(true);
    expect(viewModel.board.available).toBe(true);
  });

  it("tolerates legacy project status without an agent access token", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus({
        currentProject: {
          projectPath: "/tmp/legacy-project",
          name: "旧项目",
        } as DesktopAgentBridgeStatus["currentProject"],
      }),
    });

    expect(viewModel.readiness).toBe("connected");
    expect(viewModel.project).toMatchObject({
      open: true,
      name: "旧项目",
      path: "/tmp/legacy-project",
      token: null,
    });
    expect(viewModel.cli.available).toBe(true);
    expect(viewModel.cli.envCopyable).toBe(false);
  });

  it("distinguishes an online bridge that is waiting for a project", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus({
        currentProject: null,
      }),
    });

    expect(viewModel.readiness).toBe("waiting-project");
    expect(viewModel.collaboration).toEqual({
      status: "waiting-project",
      statusText: "请先打开项目",
      description: "连接已经开启，打开项目后即可在 Codex 中使用。",
      projectName: null,
    });
    expect(viewModel.statusText).toBe("Agent 集成已开启");
    expect(viewModel.badgeText).toBe("等待项目");
    expect(viewModel.connected).toBe(false);
    expect(viewModel.project.open).toBe(false);
    expect(viewModel.cli.available).toBe(true);
    expect(viewModel.cli.envCopyable).toBe(false);
    expect(viewModel.board.available).toBe(true);
  });

  it("explains when Codex collaboration is temporarily unavailable", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus({
        ready: false,
        currentProject: null,
        boardUrl: null,
      }),
    });

    expect(viewModel.collaboration).toEqual({
      status: "unavailable",
      statusText: "暂不可用",
      description: "连接尚未就绪，请稍后重试或查看连接详情。",
      projectName: null,
    });
  });

  it("surfaces ACP configuration without requiring UI components to inspect settings", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
      acpAgentSettings: createAcpSettings({
        enabled: false,
      }),
    });

    expect(viewModel.acp.configured).toBe(true);
    expect(viewModel.acp.enabled).toBe(false);
    expect(viewModel.acp.agentId).toBeNull();
    expect(viewModel.acp.agentName).toBe(null);
    expect(viewModel.acp.statusText).toBe("已配置，未启用");
  });

  it("surfaces the selected ACP Agent and running task state", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
      acpAgentSettings: createAcpSettings(),
      runningTaskId: "acp-task-1",
    });

    expect(viewModel.acp.configured).toBe(true);
    expect(viewModel.acp.enabled).toBe(true);
    expect(viewModel.acp.agentId).toBe("default");
    expect(viewModel.acp.agentName).toBe("测试 ACP Agent");
    expect(viewModel.acp.running).toBe(true);
    expect(viewModel.acp.runningTaskId).toBe("acp-task-1");
    expect(viewModel.acp.statusText).toBe("任务运行中");
  });

  it("preserves ACP configuration without exposing runtime readiness while the experiment is off", () => {
    const integration = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
      acpAgentSettings: createAcpSettings({ experimentalEnabled: false }),
      runningTaskId: "acp-task-hidden",
    });
    const acpGeneration = buildAcpAgentGenerationViewModel({
      integration,
      isAgentBrowserRoute: false,
      canStartAcpAgentTask: true,
      taskRunning: true,
      agentTaskStatus: {
        taskId: "acp-task-hidden",
        status: "running",
        message: "任务运行中",
      },
    });

    expect(integration.acp).toMatchObject({
      experimentalEnabled: false,
      configured: true,
      enabled: false,
      runningTaskId: null,
      running: false,
    });
    expect(acpGeneration.ready).toBe(false);
    expect(acpGeneration.composerConfig.showModeSwitch).toBe(false);
  });
});

describe("buildAgentCliEnvironmentExports", () => {
  it("returns null until the bridge endpoint and project token are available", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus({
        currentProject: null,
      }),
    });

    expect(buildAgentCliEnvironmentExports(viewModel)).toBeNull();
  });

  it("formats the current bridge, project token, and board URL as shell exports", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus({
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=token-with-'quote",
        currentProject: {
          projectPath: "/tmp/corestudio-project",
          name: "测试项目",
          agentAccess: {
            enabled: true,
            token: "token-with-'quote",
          },
        },
      }),
    });

    expect(buildAgentCliEnvironmentExports(viewModel)).toEqual([
      "export CORESTUDIO_AGENT_BRIDGE_URL='http://127.0.0.1:60909'",
      "export CORESTUDIO_AGENT_PROJECT_TOKEN='token-with-'\\''quote'",
      "export CORESTUDIO_AGENT_BOARD_URL='http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=token-with-'\\''quote'",
    ]);
  });
});

describe("buildAgentBoardStartupViewModel", () => {
  it("explains the initial desktop connection wait state", () => {
    expect(
      buildAgentBoardStartupViewModel({
        phase: "bridge-connection",
        bridgeStatus: null,
      }),
    ).toEqual({
      heading: "正在连接桌面端",
      description: "请确认 CoreStudio 桌面端仍在运行，然后刷新连接状态。",
      actionLabel: "刷新连接状态",
    });
  });

  it("explains the disconnected desktop bridge state", () => {
    expect(
      buildAgentBoardStartupViewModel({
        phase: "bridge-connection",
        bridgeStatus: createBridgeStatus({ ready: false }),
      }),
    ).toEqual({
      heading: "桌面端未连接",
      description: "请确认 CoreStudio 桌面端仍在运行，然后刷新连接状态。",
      actionLabel: "刷新连接状态",
    });
  });

  it("explains the current project loading state from the bridge project", () => {
    expect(
      buildAgentBoardStartupViewModel({
        phase: "project-loading",
        bridgeStatus: createBridgeStatus({
          currentProject: {
            projectPath: "/tmp/corestudio-project",
            name: "工业设计助手",
            agentAccess: {
              enabled: true,
              token: "project-token",
            },
          },
        }),
      }),
    ).toEqual({
      heading: "正在进入桌面端当前项目",
      description: "当前项目：工业设计助手",
      actionLabel: "重新加载当前画板",
    });
  });

  it("uses a generic project loading message without a bridge project name", () => {
    expect(
      buildAgentBoardStartupViewModel({
        phase: "project-loading",
        bridgeStatus: createBridgeStatus({
          currentProject: null,
        }),
      }),
    ).toEqual({
      heading: "正在进入桌面端当前项目",
      description: "已确认本地桥连接，正在读取桌面端当前项目。",
      actionLabel: "重新加载当前画板",
    });
  });
});

describe("Agent integration copy actions", () => {
  it("builds the Board link copy action from the integration state", () => {
    const readyIntegration = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
    });
    expect(buildAgentBoardCopyAction(readyIntegration)).toEqual({
      text: readyIntegration.bridge.boardUrl,
      successMessage: "Agent Board 链接已复制。",
      errorMessage: null,
    });

    const waitingIntegration = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus({
        boardUrl: null,
      }),
    });
    expect(buildAgentBoardCopyAction(waitingIntegration)).toEqual({
      text: null,
      successMessage: null,
      errorMessage: "Agent Board 链接尚未就绪。",
    });
  });

  it("builds the CLI environment copy action from the integration state", () => {
    const integration = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
    });

    expect(buildAgentCliEnvironmentCopyAction(integration)).toEqual({
      text: [
        "export CORESTUDIO_AGENT_BRIDGE_URL='http://127.0.0.1:60909'",
        "export CORESTUDIO_AGENT_PROJECT_TOKEN='project-token'",
        "export CORESTUDIO_AGENT_BOARD_URL='http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=project-token'",
      ].join("\n"),
      successMessage: "CLI 环境变量已复制。",
      errorMessage: null,
    });

    const unavailableIntegration = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus({
        currentProject: null,
      }),
    });
    expect(buildAgentCliEnvironmentCopyAction(unavailableIntegration)).toEqual({
      text: null,
      successMessage: null,
      errorMessage: "CLI 环境变量尚未就绪，请先开启 Agent 集成并打开项目。",
    });
  });
});

describe("buildAgentBoardStartupRenderPlan", () => {
  it("does not render an Agent Board startup pane outside the Agent browser route", () => {
    expect(
      buildAgentBoardStartupRenderPlan({
        isAgentBrowserRoute: false,
        hasInitialProjectToken: true,
        bridgeStatus: null,
        hasCurrentProject: false,
        hasInitialData: false,
      }),
    ).toEqual({ action: "none" });
  });

  it("renders the bridge connection startup pane until the desktop bridge is ready", () => {
    expect(
      buildAgentBoardStartupRenderPlan({
        isAgentBrowserRoute: true,
        hasInitialProjectToken: false,
        bridgeStatus: null,
        hasCurrentProject: false,
        hasInitialData: false,
      }),
    ).toEqual({
      action: "show-startup",
      phase: "bridge-connection",
      viewModel: {
        heading: "正在连接桌面端",
        description: "请确认 CoreStudio 桌面端仍在运行，然后刷新连接状态。",
        actionLabel: "刷新连接状态",
      },
    });

    expect(
      buildAgentBoardStartupRenderPlan({
        isAgentBrowserRoute: true,
        hasInitialProjectToken: false,
        bridgeStatus: createBridgeStatus({ ready: false }),
        hasCurrentProject: false,
        hasInitialData: false,
      }),
    ).toMatchObject({
      action: "show-startup",
      phase: "bridge-connection",
      viewModel: {
        heading: "桌面端未连接",
      },
    });
  });

  it("renders the current project loading pane while the browser route catches up", () => {
    expect(
      buildAgentBoardStartupRenderPlan({
        isAgentBrowserRoute: true,
        hasInitialProjectToken: true,
        bridgeStatus: createBridgeStatus({
          currentProject: {
            projectPath: "/tmp/corestudio-project",
            name: "工业设计助手",
            agentAccess: {
              enabled: true,
              token: "project-token",
            },
          },
        }),
        hasCurrentProject: true,
        hasInitialData: false,
      }),
    ).toEqual({
      action: "show-startup",
      phase: "project-loading",
      viewModel: {
        heading: "正在进入桌面端当前项目",
        description: "当前项目：工业设计助手",
        actionLabel: "重新加载当前画板",
      },
    });
  });

  it("falls through once the Agent Board route can render the current project", () => {
    expect(
      buildAgentBoardStartupRenderPlan({
        isAgentBrowserRoute: true,
        hasInitialProjectToken: true,
        bridgeStatus: createBridgeStatus(),
        hasCurrentProject: true,
        hasInitialData: true,
      }),
    ).toEqual({ action: "none" });
  });
});

describe("buildAcpAgentGenerationViewModel", () => {
  it("builds desktop ACP generation composer and conversation availability", () => {
    const integration = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
      acpAgentSettings: createAcpSettings(),
    });

    const viewModel = buildAcpAgentGenerationViewModel({
      integration,
      isAgentBrowserRoute: false,
      canStartAcpAgentTask: true,
      taskRunning: false,
      agentTaskStatus: null,
    });

    expect(viewModel.ready).toBe(true);
    expect(viewModel.canSubmitMessage).toBe(true);
    expect(viewModel.submitMessageDisabledReason).toBe("Agent 暂不可用");
    expect(viewModel.composerConfig).toMatchObject({
      defaultMode: "direct",
      showModeSwitch: true,
      modeSwitchVariant: "acp-agent",
      showModeIndicator: false,
      defaultGenerationSource: "builtin",
      showGenerationSourceSwitch: false,
      agentGenerationAvailable: true,
      agentGenerationUnavailableMessage: "Agent 暂不可用。",
      agentTaskStatus: null,
    });
  });

  it("keeps Agent Board composer state on the defensive direct-generation boundary", () => {
    const integration = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
      acpAgentSettings: createAcpSettings(),
      runningTaskId: "acp-task-1",
    });

    const viewModel = buildAcpAgentGenerationViewModel({
      integration,
      isAgentBrowserRoute: true,
      canStartAcpAgentTask: true,
      taskRunning: true,
      agentTaskStatus: {
        taskId: "acp-task-1",
        status: "running",
        message: "任务运行中",
      },
    });

    expect(viewModel.ready).toBe(true);
    expect(viewModel.canSubmitMessage).toBe(false);
    expect(viewModel.submitMessageDisabledReason).toBe("当前任务处理中");
    expect(viewModel.composerConfig).toMatchObject({
      defaultMode: "direct",
      showModeSwitch: false,
      modeSwitchVariant: "acp-agent",
      showModeIndicator: false,
      defaultGenerationSource: "builtin",
      showGenerationSourceSwitch: false,
      agentGenerationAvailable: false,
      agentTaskStatus: {
        taskId: "acp-task-1",
        status: "running",
        message: "任务运行中",
      },
    });
  });

  it("keeps ACP submission disabled until a selected agent and bridge command are available", () => {
    const integration = buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
      acpAgentSettings: createAcpSettings({
        enabled: false,
      }),
    });

    const viewModel = buildAcpAgentGenerationViewModel({
      integration,
      isAgentBrowserRoute: false,
      canStartAcpAgentTask: false,
      taskRunning: false,
      agentTaskStatus: null,
    });

    expect(viewModel.ready).toBe(false);
    expect(viewModel.canSubmitMessage).toBe(false);
    expect(viewModel.submitMessageDisabledReason).toBe(
      "先在设置里启用 ACP Agent",
    );
    expect(viewModel.composerConfig).toMatchObject({
      defaultMode: "direct",
      showModeSwitch: false,
      modeSwitchVariant: "acp-agent",
      agentGenerationAvailable: false,
      agentGenerationUnavailableMessage: "先在设置里启用 ACP Agent。",
    });
  });
});

describe("buildAgentIntegrationRuntimeViewModel", () => {
  it("builds the shared integration, ACP generation, and Agent Board startup state together", () => {
    const runtime = buildAgentIntegrationRuntimeViewModel({
      bridgeStatus: createBridgeStatus(),
      acpAgentSettings: createAcpSettings(),
      agentTaskStatus: {
        taskId: "acp-task-1",
        status: "running",
        message: "任务运行中",
      },
      taskRunning: true,
      canStartAcpAgentTask: true,
      isAgentBrowserRoute: true,
      hasInitialProjectToken: true,
      hasCurrentProject: true,
      hasInitialData: false,
    });

    expect(runtime.integration.acp.runningTaskId).toBe("acp-task-1");
    expect(runtime.integration.acp.running).toBe(true);
    expect(runtime.acpGeneration.ready).toBe(true);
    expect(runtime.acpGeneration.canSubmitMessage).toBe(false);
    expect(runtime.acpGeneration.submitMessageDisabledReason).toBe(
      "当前任务处理中",
    );
    expect(runtime.boardStartup).toMatchObject({
      action: "show-startup",
      phase: "project-loading",
      viewModel: {
        heading: "正在进入桌面端当前项目",
      },
    });
  });

  it("does not expose a finished ACP task as the running integration task", () => {
    const runtime = buildAgentIntegrationRuntimeViewModel({
      bridgeStatus: createBridgeStatus(),
      acpAgentSettings: createAcpSettings(),
      agentTaskStatus: {
        taskId: "acp-task-done",
        status: "completed",
        message: "任务完成",
      },
      taskRunning: false,
      canStartAcpAgentTask: true,
      isAgentBrowserRoute: false,
      hasInitialProjectToken: false,
      hasCurrentProject: true,
      hasInitialData: true,
    });

    expect(runtime.integration.acp.runningTaskId).toBeNull();
    expect(runtime.integration.acp.running).toBe(false);
    expect(runtime.acpGeneration.canSubmitMessage).toBe(true);
    expect(runtime.boardStartup).toEqual({ action: "none" });
  });
});
