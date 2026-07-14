import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";
import { AgentIntegrationSettingsSections } from "./AgentIntegrationSettingsSections";

const baseIntegration: AgentIntegrationViewModel = {
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

const renderSections = (
  overrides: Partial<Parameters<typeof AgentIntegrationSettingsSections>[0]> = {},
) => {
  const props: Parameters<typeof AgentIntegrationSettingsSections>[0] = {
    integration: baseIntegration,
    acpExperimentalEnabled: false,
    canToggleIntegration: true,
    onIntegrationEnabledChange: vi.fn(),
    onCopyBoardUrl: vi.fn(),
    onOpenBoardUrl: vi.fn(),
    onCopyCliEnvironment: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<AgentIntegrationSettingsSections {...props} />),
  };
};

describe("AgentIntegrationSettingsSections", () => {
  it("renders integration, board, CLI, and ACP status from the view model", () => {
    renderSections({ acpExperimentalEnabled: true });

    const statusGrid = screen.getByLabelText("Agent 集成状态");
    expect(within(statusGrid).getByText("Bridge")).toBeInTheDocument();
    expect(within(statusGrid).getByText("已启动")).toBeInTheDocument();
    expect(within(statusGrid).getByText("工业设计助手")).toBeInTheDocument();
    expect(within(statusGrid).getByText("可复制 Board 链接")).toBeInTheDocument();
    expect(within(statusGrid).getByText("可自动发现当前会话")).toBeInTheDocument();
    expect(within(statusGrid).getByText("Codex ACP")).toBeInTheDocument();
  });

  it("explains the three Agent usage paths with prerequisites and write-back rules", () => {
    renderSections({ acpExperimentalEnabled: true });

    const usagePaths = screen.getByLabelText("Agent 使用路径");

    expect(within(usagePaths).getByText("网页画布")).toBeInTheDocument();
    expect(
      within(usagePaths).getByText(
        "在 Codex、Cursor 等 Agent 内置浏览器里查看和操作当前画板。",
      ),
    ).toBeInTheDocument();
    expect(
      within(usagePaths).getByText("结果：画布、生成记录、右下角状态浮层"),
    ).toBeInTheDocument();
    expect(within(usagePaths).getByText("CLI")).toBeInTheDocument();
    expect(
      within(usagePaths).getByText(
        "所有写入都经过 CoreStudio 校验，不直接改项目文件。",
      ),
    ).toBeInTheDocument();
    expect(
      within(usagePaths).getByText("结果：画布、生成记录、项目健康报告"),
    ).toBeInTheDocument();
    expect(within(usagePaths).getByText("ACP Agent")).toBeInTheDocument();
    expect(
      within(usagePaths).getByText(
        "从 CoreStudio 主动发起复杂任务，并在左侧栏继续对话。",
      ),
    ).toBeInTheDocument();
    expect(
      within(usagePaths).getByText("结果：左侧 Agent 对话、画布、生成记录"),
    ).toBeInTheDocument();
  });

  it("hides ACP status and usage paths while the experiment is disabled", () => {
    renderSections();

    const statusGrid = screen.getByLabelText("Agent 集成状态");
    const usagePaths = screen.getByLabelText("Agent 使用路径");
    expect(within(statusGrid).queryByText("ACP")).not.toBeInTheDocument();
    expect(within(statusGrid).queryByText("Codex ACP")).not.toBeInTheDocument();
    expect(within(usagePaths).queryByText("ACP Agent")).not.toBeInTheDocument();
  });

  it("does not render record, conversation, or debug responsibilities", () => {
    renderSections();

    expect(screen.queryByText("生成记录")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent 对话")).not.toBeInTheDocument();
    expect(screen.queryByText("最近 Agent 任务")).not.toBeInTheDocument();
    expect(screen.queryByText("ACP 调试记录")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "刷新记录" })).not.toBeInTheDocument();
    expect(screen.queryByText("任务说明模板")).not.toBeInTheDocument();
  });

  it("reports integration toggle and quick actions", () => {
    const onIntegrationEnabledChange = vi.fn();
    const onCopyBoardUrl = vi.fn();
    const onOpenBoardUrl = vi.fn();
    const onCopyCliEnvironment = vi.fn();

    renderSections({
      onIntegrationEnabledChange,
      onCopyBoardUrl,
      onOpenBoardUrl,
      onCopyCliEnvironment,
    });

    fireEvent.click(screen.getByRole("switch", { name: "启用 Agent 集成" }));
    fireEvent.click(screen.getByRole("button", { name: "复制网页画布链接" }));
    fireEvent.click(screen.getByRole("button", { name: "打开网页画布" }));
    fireEvent.click(screen.getByRole("button", { name: "复制 CLI 环境变量" }));

    expect(onIntegrationEnabledChange).toHaveBeenCalledWith(false);
    expect(onCopyBoardUrl).toHaveBeenCalled();
    expect(onOpenBoardUrl).toHaveBeenCalled();
    expect(onCopyCliEnvironment).toHaveBeenCalled();
  });

  it("disables actions while integration prerequisites are missing", () => {
    renderSections({
      canToggleIntegration: false,
      integration: {
        ...baseIntegration,
        enabled: false,
        bridge: {
          ...baseIntegration.bridge,
          ready: false,
          boardUrl: null,
        },
        board: {
          available: false,
          statusText: "等待 Board 链接",
        },
        cli: {
          available: false,
          envCopyable: false,
          statusText: "开启连接后可发现",
        },
      },
    });

    expect(screen.getByRole("switch", { name: "启用 Agent 集成" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "复制网页画布链接" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "打开网页画布" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "复制 CLI 环境变量" })).toBeDisabled();
  });
});
