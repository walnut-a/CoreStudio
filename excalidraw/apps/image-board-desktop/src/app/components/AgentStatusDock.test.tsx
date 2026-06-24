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
          ready: true,
          currentProject: {
            projectPath: "/tmp/corestudio-project",
            name: "测试项目",
          },
          boardUrl: "http://127.0.0.1:5174/agent-board?bridge=1&token=2",
        }}
        onCopyAgentBoardUrl={onCopyAgentBoardUrl}
        onRefreshStatus={onRefreshStatus}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(screen.getByRole("region", { name: "Agent 连接设置" })).toBeInTheDocument();
    expect(screen.getByText("Agent 已连接")).toBeInTheDocument();
    expect(screen.getByText("测试项目")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "复制 Board 链接" }));
    fireEvent.click(screen.getByRole("button", { name: "刷新状态" }));

    expect(onCopyAgentBoardUrl).toHaveBeenCalledTimes(1);
    expect(onRefreshStatus).toHaveBeenCalledTimes(1);
  });

  it("keeps the Board link action disabled until a bridge URL is available", () => {
    render(
      <AgentStatusDock
        status={{
          ready: false,
          currentProject: null,
          boardUrl: null,
        }}
        onCopyAgentBoardUrl={vi.fn()}
        onRefreshStatus={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agent 连接状态" }));

    expect(screen.getByText("Agent 未就绪")).toBeInTheDocument();
    expect(screen.getByText("未打开项目")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制 Board 链接" })).toBeDisabled();
  });
});
