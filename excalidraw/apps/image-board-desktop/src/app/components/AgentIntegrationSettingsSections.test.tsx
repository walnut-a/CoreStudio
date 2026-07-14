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
  collaboration: {
    status: "ready",
    statusText: "已可用",
    description: "Codex 可以访问当前项目。",
    projectName: "工业设计助手",
  },
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
    experimentalEnabled: true,
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
  it("presents one clear Codex collaboration status", () => {
    renderSections();

    expect(screen.getByText("Codex 协作")).toBeInTheDocument();
    expect(screen.getByText("已可用")).toBeInTheDocument();
    expect(screen.getByText("Codex 可以访问当前项目。")).toBeInTheDocument();
    expect(screen.getByText("当前项目：工业设计助手")).toBeInTheDocument();
  });

  it("keeps technical connection information in one collapsed details section", () => {
    renderSections();

    const details = screen.getByText("连接详情").closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(within(details as HTMLElement).getByText("本地连接")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("网页画布")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("CLI")).toBeInTheDocument();
    expect(screen.queryByText("ACP Agent")).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("switch", { name: "启用 Codex 协作" }));
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

    expect(screen.getByRole("switch", { name: "启用 Codex 协作" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "复制网页画布链接" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "打开网页画布" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "复制 CLI 环境变量" })).toBeDisabled();
  });
});
