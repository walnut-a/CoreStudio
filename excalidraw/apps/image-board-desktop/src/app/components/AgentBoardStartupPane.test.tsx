import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { buildAgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";
import { AgentBoardStartupPane } from "./AgentBoardStartupPane";

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

const renderPane = (
  overrides: Partial<Parameters<typeof AgentBoardStartupPane>[0]> = {},
) => {
  const props: Parameters<typeof AgentBoardStartupPane>[0] = {
    heading: "桌面端未连接",
    description: "请确认 CoreStudio 桌面端仍在运行。",
    actionLabel: "刷新连接状态",
    startupError: null,
    projectError: null,
    integration: buildAgentIntegrationViewModel({
      bridgeStatus: createBridgeStatus(),
    }),
    onAction: vi.fn(),
    onOpenAgentSettings: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<AgentBoardStartupPane {...props} />),
    props,
  };
};

describe("AgentBoardStartupPane", () => {
  it("renders the Agent Board startup message, errors, action, and status dock", () => {
    const onAction = vi.fn();

    renderPane({
      heading: "正在进入桌面端当前项目",
      description: "当前项目：工业设计助手",
      actionLabel: "重新加载当前画板",
      startupError: "启动状态读取失败",
      projectError: "项目读取失败",
      onAction,
    });

    expect(
      screen.getByRole("heading", { name: "正在进入桌面端当前项目" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Agent Bridge")).toBeInTheDocument();
    expect(screen.getByText("当前项目：工业设计助手")).toBeInTheDocument();
    expect(screen.getByText("启动状态读取失败")).toBeInTheDocument();
    expect(screen.getByText("项目读取失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新加载当前画板" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Codex 协作状态" }),
    ).toBeInTheDocument();
  });

  it("opens settings from the simplified collaboration status dock", () => {
    const onOpenAgentSettings = vi.fn();
    const onAction = vi.fn();

    renderPane({
      onOpenAgentSettings,
      onAction,
    });

    fireEvent.click(screen.getByRole("button", { name: "Codex 协作状态" }));
    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));

    expect(onOpenAgentSettings).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });
});
