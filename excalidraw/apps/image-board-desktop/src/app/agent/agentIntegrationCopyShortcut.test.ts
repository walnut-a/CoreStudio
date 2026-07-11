import { describe, expect, it, vi } from "vitest";

import {
  createAgentIntegrationCopyShortcutRendererActions,
  runAgentIntegrationCopyShortcut,
  runAgentIntegrationCopyShortcutRendererAction,
} from "./agentIntegrationCopyShortcut";

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

describe("runAgentIntegrationCopyShortcut", () => {
  it("refreshes bridge status before copying the Agent Board URL", async () => {
    const copyText = vi.fn().mockResolvedValue(true);
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const refreshedStatus = createBridgeStatus({
      boardUrl:
        "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A7777&projectToken=fresh-token",
    });

    await expect(
      runAgentIntegrationCopyShortcut({
        shortcut: "board-url",
        bridgeStatus: createBridgeStatus({
          boardUrl:
            "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=stale-token",
        }),
        acpAgentSettings: createAcpSettings(),
        runningTaskId: null,
        refreshBridgeStatus: vi.fn().mockResolvedValue(refreshedStatus),
        copyText,
        onSuccess,
        onError,
      }),
    ).resolves.toEqual({
      status: "copied",
      message: "Agent Board 链接已复制。",
    });

    expect(copyText).toHaveBeenCalledWith(refreshedStatus.boardUrl);
    expect(onSuccess).toHaveBeenCalledWith("Agent Board 链接已复制。");
    expect(onError).not.toHaveBeenCalled();
  });

  it("surfaces the CLI environment unavailable state without touching the clipboard", async () => {
    const copyText = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await expect(
      runAgentIntegrationCopyShortcut({
        shortcut: "cli-environment",
        bridgeStatus: createBridgeStatus({
          currentProject: null,
        }),
        acpAgentSettings: null,
        runningTaskId: null,
        refreshBridgeStatus: vi.fn().mockResolvedValue(null),
        copyText,
        onSuccess,
        onError,
      }),
    ).resolves.toEqual({
      status: "unavailable",
      message: "CLI 环境变量尚未就绪，请先开启 Agent 集成并打开项目。",
    });

    expect(copyText).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      "CLI 环境变量尚未就绪，请先开启 Agent 集成并打开项目。",
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not show a success notice when clipboard copy fails", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await expect(
      runAgentIntegrationCopyShortcut({
        shortcut: "cli-environment",
        bridgeStatus: createBridgeStatus(),
        acpAgentSettings: createAcpSettings(),
        runningTaskId: "acp-task-1",
        refreshBridgeStatus: vi.fn().mockResolvedValue(null),
        copyText: vi.fn().mockResolvedValue(false),
        onSuccess,
        onError,
      }),
    ).resolves.toEqual({
      status: "copy-failed",
      message: null,
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe("runAgentIntegrationCopyShortcutRendererAction", () => {
  it("reads the latest runtime state through getters before copying the Board URL", async () => {
    const refreshedStatus = createBridgeStatus({
      boardUrl:
        "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A8888&projectToken=fresh-token",
    });
    const copyText = vi.fn().mockResolvedValue(true);
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await expect(
      runAgentIntegrationCopyShortcutRendererAction({
        shortcut: "board-url",
        getBridgeStatus: () =>
          createBridgeStatus({
            boardUrl:
              "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=stale-token",
          }),
        getAcpAgentSettings: () => createAcpSettings(),
        getRunningTaskId: () => "running-task",
        refreshBridgeStatus: vi.fn().mockResolvedValue(refreshedStatus),
        copyText,
        onSuccess,
        onError,
      }),
    ).resolves.toEqual({
      status: "copied",
      message: "Agent Board 链接已复制。",
    });

    expect(copyText).toHaveBeenCalledWith(refreshedStatus.boardUrl);
    expect(onSuccess).toHaveBeenCalledWith("Agent Board 链接已复制。");
    expect(onError).not.toHaveBeenCalled();
  });

  it("uses the running task getter when copying the CLI environment", async () => {
    const copyText = vi.fn().mockResolvedValue(true);
    const getRunningTaskId = vi.fn(() => "acp-task-from-ref");

    await runAgentIntegrationCopyShortcutRendererAction({
      shortcut: "cli-environment",
      getBridgeStatus: () => createBridgeStatus(),
      getAcpAgentSettings: () => createAcpSettings(),
      getRunningTaskId,
      refreshBridgeStatus: vi.fn().mockResolvedValue(null),
      copyText,
      onSuccess: vi.fn(),
      onError: vi.fn(),
    });

    expect(copyText).toHaveBeenCalledWith(
      expect.stringContaining("CORESTUDIO_AGENT_PROJECT_TOKEN='project-token'"),
    );
    expect(getRunningTaskId).toHaveBeenCalledTimes(1);
  });
});

describe("createAgentIntegrationCopyShortcutRendererActions", () => {
  it("creates Board URL and CLI environment copy handlers from shared runtime getters", async () => {
    const bridgeStatus = createBridgeStatus();
    const getBridgeStatus = vi.fn(() => bridgeStatus);
    const getAcpAgentSettings = vi.fn(() => createAcpSettings());
    const getRunningTaskId = vi.fn(() => "acp-task-from-ref");
    const refreshBridgeStatus = vi.fn().mockResolvedValue(null);
    const copyText = vi.fn().mockResolvedValue(true);
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const actions = createAgentIntegrationCopyShortcutRendererActions({
      getBridgeStatus,
      getAcpAgentSettings,
      getRunningTaskId,
      refreshBridgeStatus,
      copyText,
      onSuccess,
      onError,
    });

    await expect(actions.copyBoardUrl()).resolves.toEqual({
      status: "copied",
      message: "Agent Board 链接已复制。",
    });
    await expect(actions.copyCliEnvironment()).resolves.toEqual({
      status: "copied",
      message: "CLI 环境变量已复制。",
    });

    expect(getBridgeStatus).toHaveBeenCalledTimes(2);
    expect(getAcpAgentSettings).toHaveBeenCalledTimes(2);
    expect(getRunningTaskId).toHaveBeenCalledTimes(2);
    expect(refreshBridgeStatus).toHaveBeenCalledTimes(2);
    expect(copyText).toHaveBeenNthCalledWith(1, bridgeStatus.boardUrl);
    expect(copyText).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("CORESTUDIO_AGENT_PROJECT_TOKEN='project-token'"),
    );
    expect(onSuccess).toHaveBeenCalledWith("Agent Board 链接已复制。");
    expect(onSuccess).toHaveBeenCalledWith("CLI 环境变量已复制。");
    expect(onError).not.toHaveBeenCalled();
  });
});
