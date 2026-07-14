import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE } from "../../shared/acpTypes";
import type { AgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";
import type { GenerationErrorDetails } from "../generationErrorViewModel";
import { AppGlobalDialogs } from "./AppGlobalDialogs";

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

const generationErrorDetails: GenerationErrorDetails = {
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  occurredAt: "2026-07-06T08:09:10.000Z",
  normalizedMessage: "ZenMux 余额不足",
  rawMessage: "Credit required",
  requestPayload: null,
  stack: null,
};

const createProps = (
  overrides: Partial<Parameters<typeof AppGlobalDialogs>[0]> = {},
): Parameters<typeof AppGlobalDialogs>[0] => ({
  about: {
    open: false,
    appInfo: { name: "CoreStudio", version: "9.8.7" },
    onClose: vi.fn(),
  },
  agentSettings: {
    open: false,
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
    acpExperimentalEnabled: false,
    acpDebugOpen: false,
    acpRunSummaries: [],
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
    onAcpExperimentalEnabledChange: vi.fn(),
    onAcpDebugOpenChange: vi.fn(),
    onRefreshAcpRunSummaries: vi.fn(),
    onOpenAcpRunLog: vi.fn(),
  },
  acpRunLog: {
    open: false,
    loading: false,
    error: null,
    detail: null,
    rawOpen: false,
    onRawOpenChange: vi.fn(),
    onClose: vi.fn(),
  },
  projectDataReport: {
    open: false,
    healthReport: null,
    repairReport: null,
    onClose: vi.fn(),
  },
  generationErrorDetails: {
    open: false,
    details: null,
    copied: false,
    onCopyDetails: vi.fn(),
    onClose: vi.fn(),
  },
  ...overrides,
});

describe("AppGlobalDialogs", () => {
  it("does not render any global dialog while all surfaces are closed", () => {
    render(<AppGlobalDialogs {...createProps()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the about dialog and forwards close", () => {
    const onClose = vi.fn();
    render(
      <AppGlobalDialogs
        {...createProps({
          about: {
            ...createProps().about,
            open: true,
            onClose,
          },
        })}
      />,
    );

    expect(screen.getByRole("dialog", { name: "关于 CoreStudio" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭关于页面" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders generation error details and forwards copy", () => {
    const onCopyDetails = vi.fn();
    render(
      <AppGlobalDialogs
        {...createProps({
          generationErrorDetails: {
            ...createProps().generationErrorDetails,
            open: true,
            details: generationErrorDetails,
            onCopyDetails,
          },
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "复制详细报错" }));

    expect(onCopyDetails).toHaveBeenCalledTimes(1);
  });
});
