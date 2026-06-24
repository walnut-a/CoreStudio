import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopBar } from "./TopBar";

describe("TopBar", () => {
  const baseProps = {
    projectName: "测试项目",
    onOpenProject: vi.fn(),
    onImportImages: vi.fn(),
    onRevealProject: vi.fn(),
  };

  it("shows the Agent Bridge status and exposes the Agent Board action", () => {
    const onCopyAgentBoardUrl = vi.fn();

    render(
      <TopBar
        {...baseProps}
        agentBridgeStatus={{
          ready: true,
          currentProject: {
            projectPath: "/tmp/corestudio-project",
            name: "测试项目",
          },
          boardUrl: "http://127.0.0.1:5174/agent-board?bridge=1&token=2",
        }}
        onCopyAgentBoardUrl={onCopyAgentBoardUrl}
      />,
    );

    expect(screen.getByText("Agent Bridge 已连接")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "复制 Agent Board 链接" }),
    );

    expect(onCopyAgentBoardUrl).toHaveBeenCalledTimes(1);
  });
});
