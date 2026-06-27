import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentStatusDock } from "./AgentStatusDock";

describe("AgentStatusDock", () => {
  it("opens a status popover with shortcut actions", () => {
    const onCopyAgentBoardUrl = vi.fn();
    const onRefreshStatus = vi.fn();

    render(
      <AgentStatusDock
        status={{
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
        }}
        onCopyAgentBoardUrl={onCopyAgentBoardUrl}
        onRefreshStatus={onRefreshStatus}
        acpAgentName="测试 ACP Agent"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(
      screen.getByRole("region", { name: "Agent 连接设置" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Agent 已连接")).toBeInTheDocument();
    expect(screen.getByText("测试项目")).toBeInTheDocument();
    expect(screen.getByText("http://127.0.0.1:60909")).toBeInTheDocument();
    expect(screen.getByText("ACP Agent")).toBeInTheDocument();
    expect(screen.getByText("测试 ACP Agent")).toBeInTheDocument();
    expect(screen.getByText("CLI")).toBeInTheDocument();
    expect(screen.getByText("可自动发现当前会话")).toBeInTheDocument();
    expect(screen.getByText("可复制 Board 链接")).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "允许 Agent 调用" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("自动刷新连接状态")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "复制 Board 链接" }));
    fireEvent.click(screen.getByRole("button", { name: "刷新状态" }));

    expect(onCopyAgentBoardUrl).toHaveBeenCalledTimes(1);
    expect(onRefreshStatus).toHaveBeenCalledTimes(1);
  });

  it("keeps the Board link action disabled until a bridge URL is available", () => {
    render(
      <AgentStatusDock
        status={{
          enabled: false,
          ready: false,
          currentProject: null,
          boardUrl: null,
        }}
        onCopyAgentBoardUrl={vi.fn()}
        onRefreshStatus={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(screen.getByText("Agent 调用已关闭")).toBeInTheDocument();
    expect(screen.getByText("未打开项目")).toBeInTheDocument();
    expect(screen.getByText("未启动")).toBeInTheDocument();
    expect(screen.getByText("等待 Board 链接")).toBeInTheDocument();
    expect(screen.getByText("开启连接后可发现")).toBeInTheDocument();
    expect(screen.getByText("未配置")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制 Board 链接" })).toBeDisabled();
  });

  it("distinguishes a connected bridge from an opened project", () => {
    render(
      <AgentStatusDock
        status={{
          enabled: true,
          ready: true,
          currentProject: null,
          boardUrl:
            "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
        }}
        onCopyAgentBoardUrl={vi.fn()}
        onRefreshStatus={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(screen.getByText("Agent 调用已开启")).toBeInTheDocument();
    expect(screen.getByText("等待项目")).toBeInTheDocument();
    expect(screen.getByText("未打开项目")).toBeInTheDocument();
    expect(screen.getByText("http://127.0.0.1:60909")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制 Board 链接" })).toBeEnabled();
  });

  it("does not expose the software-level Agent switch in the canvas status popover", () => {
    render(
      <AgentStatusDock
        status={{
          enabled: false,
          ready: false,
          currentProject: null,
          boardUrl: null,
        }}
        onCopyAgentBoardUrl={vi.fn()}
        onRefreshStatus={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(
      screen.queryByRole("switch", { name: "允许 Agent 调用" }),
    ).not.toBeInTheDocument();
  });
});
