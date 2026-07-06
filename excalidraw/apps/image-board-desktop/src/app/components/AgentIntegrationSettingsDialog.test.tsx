import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  type AcpRunSummary,
} from "../../shared/acpTypes";
import type { AgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";
import { AgentIntegrationSettingsDialog } from "./AgentIntegrationSettingsDialog";

const integration: AgentIntegrationViewModel = {
  readiness: "connected",
  statusText: "Agent 已连接",
  badgeText: "在线",
  enabled: true,
  connected: true,
  bridge: {
    ready: true,
    endpoint: "http://127.0.0.1:60909",
    endpointLabel: "http://127.0.0.1:60909",
    boardUrl: "http://127.0.0.1:5174/agent-board",
    boardUrlReady: true,
  },
  project: {
    open: true,
    name: "工业设计助手",
    path: "/Users/example/工业设计助手",
    token: "project-token",
  },
  cli: {
    available: true,
    envCopyable: true,
    statusText: "可自动发现当前会话",
  },
  board: {
    available: true,
    statusText: "可复制 Board 链接",
  },
  acp: {
    configured: true,
    enabled: true,
    agentId: "codex",
    agentName: "Codex ACP",
    runningTaskId: null,
    running: false,
    statusText: "Codex ACP",
  },
};

const runSummary: AcpRunSummary = {
  mode: "acp-agent",
  taskId: "task-1",
  threadId: "thread-1",
  projectToken: "project-token",
  projectName: "工业设计助手",
  agentName: "Codex ACP",
  userPrompt: "优化桌面 CNC 机器",
  status: "completed",
  startedAt: "2026-06-29T08:00:00.000Z",
  endedAt: "2026-06-29T08:00:05.000Z",
  logFile: "/tmp/corestudio-agent-runs/task-1.ndjson",
};

const renderDialog = (
  overrides: Partial<Parameters<typeof AgentIntegrationSettingsDialog>[0]> = {},
) => {
  const props: Parameters<typeof AgentIntegrationSettingsDialog>[0] = {
    open: true,
    integration,
    canToggleIntegration: true,
    currentProjectPath: "/Users/example/current-project",
    bridgeProjectPath: "/Users/example/bridge-project",
    acpAgentDraft: {
      enabled: true,
      presetId: "codex-acp",
      command: "npx",
      args: "-y @agentclientprotocol/codex-acp",
      cwd: "",
      taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
    },
    selectedAcpAgent: {
      id: "agent-1",
      presetId: "codex-acp",
      name: "Codex ACP",
      command: "npx",
      args: ["-y", "@agentclientprotocol/codex-acp"],
      cwd: null,
    },
    acpAgentEditable: true,
    acpAgentSaving: false,
    acpDebugOpen: true,
    acpRunSummaries: [runSummary],
    acpRunSummariesLoading: false,
    acpRunSummariesError: null,
    canReadAcpRunLogs: true,
    onClose: vi.fn(),
    onIntegrationEnabledChange: vi.fn(),
    onCopyBoardUrl: vi.fn(),
    onOpenBoardUrl: vi.fn(),
    onCopyCliEnvironment: vi.fn(),
    onAcpAgentEnabledChange: vi.fn(),
    onAcpAgentPresetChange: vi.fn(),
    onAcpAgentCommandChange: vi.fn(),
    onAcpAgentArgsChange: vi.fn(),
    onAcpAgentCwdChange: vi.fn(),
    onAcpTaskInstructionChange: vi.fn(),
    onSaveAcpAgentSettings: vi.fn(),
    onAcpDebugOpenChange: vi.fn(),
    onRefreshAcpRunSummaries: vi.fn(),
    onOpenAcpRunLog: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<AgentIntegrationSettingsDialog {...props} />),
  };
};

describe("AgentIntegrationSettingsDialog", () => {
  it("does not render while closed", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the app settings shell and Agent integration sections", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: "应用设置" });
    expect(within(dialog).getByText("Agent 集成")).toBeInTheDocument();
    expect(within(dialog).getAllByText("网页画布").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("CLI").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("ACP Agent").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("高级调试")).toBeInTheDocument();
  });

  it("reports the close action", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("uses the current project path as the ACP default working directory", () => {
    renderDialog();

    expect(screen.getByLabelText("工作目录")).toHaveAttribute(
      "placeholder",
      "默认：/Users/example/current-project",
    );
  });

  it("falls back to bridge project path and then a generic directory label", () => {
    const { rerender, props } = renderDialog({
      currentProjectPath: null,
      bridgeProjectPath: "/Users/example/from-bridge",
    });

    expect(screen.getByLabelText("工作目录")).toHaveAttribute(
      "placeholder",
      "默认：/Users/example/from-bridge",
    );

    rerender(
      <AgentIntegrationSettingsDialog
        {...props}
        currentProjectPath={null}
        bridgeProjectPath={null}
      />,
    );

    expect(screen.getByLabelText("工作目录")).toHaveAttribute(
      "placeholder",
      "默认：当前项目目录",
    );
  });

  it("forwards integration, ACP settings, and debug actions", () => {
    const onIntegrationEnabledChange = vi.fn();
    const onSaveAcpAgentSettings = vi.fn();
    const onRefreshAcpRunSummaries = vi.fn();
    const onOpenAcpRunLog = vi.fn();

    renderDialog({
      onIntegrationEnabledChange,
      onSaveAcpAgentSettings,
      onRefreshAcpRunSummaries,
      onOpenAcpRunLog,
    });

    fireEvent.click(screen.getByRole("switch", { name: "启用 Agent 集成" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    fireEvent.click(screen.getByRole("button", { name: "刷新记录" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "查看调试记录：优化桌面 CNC 机器",
      }),
    );

    expect(onIntegrationEnabledChange).toHaveBeenCalledWith(false);
    expect(onSaveAcpAgentSettings).toHaveBeenCalled();
    expect(onRefreshAcpRunSummaries).toHaveBeenCalled();
    expect(onOpenAcpRunLog).toHaveBeenCalledWith("task-1");
  });
});
