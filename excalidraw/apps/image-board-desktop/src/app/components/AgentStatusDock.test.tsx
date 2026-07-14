import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { buildAgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";
import { AgentStatusDock } from "./AgentStatusDock";

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
      token: "project-token",
      enabled: true,
    },
  },
  boardUrl:
    "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
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

describe("AgentStatusDock", () => {
  it("opens a status popover with shortcut actions", () => {
    const onCopyAgentBoardUrl = vi.fn();
    const onCopyCliEnvironment = vi.fn();
    const onRefreshStatus = vi.fn();
    const onOpenAgentSettings = vi.fn();
    const onOpenAgentConversation = vi.fn();

    render(
      <AgentStatusDock
        integration={buildAgentIntegrationViewModel({
          bridgeStatus: createBridgeStatus(),
          acpAgentSettings: createAcpSettings(),
        })}
        onCopyAgentBoardUrl={onCopyAgentBoardUrl}
        onCopyCliEnvironment={onCopyCliEnvironment}
        onRefreshStatus={onRefreshStatus}
        onOpenAgentSettings={onOpenAgentSettings}
        onOpenAgentConversation={onOpenAgentConversation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(screen.getByRole("region", { name: "Agent 状态" })).toBeInTheDocument();
    expect(screen.getByText("Agent 已连接")).toBeInTheDocument();
    expect(screen.getByText("测试项目")).toBeInTheDocument();
    expect(screen.getByText("http://127.0.0.1:60909")).toBeInTheDocument();
    expect(screen.getByText("ACP Agent")).toBeInTheDocument();
    expect(screen.getByText("测试 ACP Agent")).toBeInTheDocument();
    expect(screen.getByText("CLI")).toBeInTheDocument();
    expect(screen.getByText("可自动发现当前会话")).toBeInTheDocument();
    expect(screen.getByText("可复制 Board 链接")).toBeInTheDocument();
    expect(screen.queryByText("默认生成方式")).not.toBeInTheDocument();
    expect(screen.queryByText("最近 Agent 任务")).not.toBeInTheDocument();
    expect(screen.queryByText("ACP 调试记录")).not.toBeInTheDocument();
    expect(screen.queryByText("命令")).not.toBeInTheDocument();
    expect(screen.queryByText("参数")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "启用 Agent 集成" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("自动刷新连接状态")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开 Agent 对话" }));
    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));
    fireEvent.click(screen.getByRole("button", { name: "复制 CLI 环境变量" }));
    fireEvent.click(screen.getByRole("button", { name: "复制 Board 链接" }));
    fireEvent.click(screen.getByRole("button", { name: "刷新状态" }));

    expect(onOpenAgentConversation).toHaveBeenCalledTimes(1);
    expect(onOpenAgentSettings).toHaveBeenCalledTimes(1);
    expect(onCopyCliEnvironment).toHaveBeenCalledTimes(1);
    expect(onCopyAgentBoardUrl).toHaveBeenCalledTimes(1);
    expect(onRefreshStatus).toHaveBeenCalledTimes(1);
  });

  it("keeps the Board link action disabled until a bridge URL is available", () => {
    render(
      <AgentStatusDock
        integration={buildAgentIntegrationViewModel({
          bridgeStatus: createBridgeStatus({
            enabled: false,
            ready: false,
            currentProject: null,
            boardUrl: null,
          }),
        })}
        onCopyAgentBoardUrl={vi.fn()}
        onCopyCliEnvironment={vi.fn()}
        onRefreshStatus={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(screen.getByText("Agent 集成已关闭")).toBeInTheDocument();
    expect(screen.getByText("未打开项目")).toBeInTheDocument();
    expect(screen.getByText("未启动")).toBeInTheDocument();
    expect(screen.getByText("等待 Board 链接")).toBeInTheDocument();
    expect(screen.getByText("开启连接后可发现")).toBeInTheDocument();
    expect(screen.queryByText("ACP Agent")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制 Board 链接" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "复制 CLI 环境变量" })).toBeDisabled();
  });

  it("hides ACP status and conversation actions while the experiment is disabled", () => {
    render(
      <AgentStatusDock
        integration={buildAgentIntegrationViewModel({
          bridgeStatus: createBridgeStatus(),
          acpAgentSettings: createAcpSettings({ experimentalEnabled: false }),
        })}
        onCopyAgentBoardUrl={vi.fn()}
        onCopyCliEnvironment={vi.fn()}
        onRefreshStatus={vi.fn()}
        onOpenAgentSettings={vi.fn()}
        onOpenAgentConversation={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(screen.queryByText("ACP Agent")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "打开 Agent 对话" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开设置" })).toBeInTheDocument();
  });

  it("distinguishes a connected bridge from an opened project", () => {
    render(
      <AgentStatusDock
        integration={buildAgentIntegrationViewModel({
          bridgeStatus: createBridgeStatus({
            currentProject: null,
          }),
        })}
        onCopyAgentBoardUrl={vi.fn()}
        onCopyCliEnvironment={vi.fn()}
        onRefreshStatus={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(screen.getByText("Agent 集成已开启")).toBeInTheDocument();
    expect(screen.getByText("等待项目")).toBeInTheDocument();
    expect(screen.getByText("未打开项目")).toBeInTheDocument();
    expect(screen.getByText("http://127.0.0.1:60909")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制 Board 链接" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "复制 CLI 环境变量" })).toBeDisabled();
  });

  it("does not expose the software-level Agent switch in the canvas status popover", () => {
    render(
      <AgentStatusDock
        integration={buildAgentIntegrationViewModel({
          bridgeStatus: createBridgeStatus({
            enabled: false,
            ready: false,
            currentProject: null,
            boardUrl: null,
          }),
        })}
        onCopyAgentBoardUrl={vi.fn()}
        onRefreshStatus={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(
      screen.queryByRole("switch", { name: "启用 Agent 集成" }),
    ).not.toBeInTheDocument();
  });
});
