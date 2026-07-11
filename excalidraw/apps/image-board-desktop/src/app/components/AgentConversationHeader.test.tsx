import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AgentConversationHeaderActions,
  AgentConversationSummary,
} from "./AgentConversationHeader";

describe("AgentConversationHeader", () => {
  it("renders list and new thread actions with stateful labels", () => {
    const onToggleThreadList = vi.fn();
    const onStartNewThread = vi.fn();
    const { rerender } = render(
      <AgentConversationHeaderActions
        threadListOpen={false}
        disabled={false}
        onToggleThreadList={onToggleThreadList}
        onStartNewThread={onStartNewThread}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "打开 Agent 对话列表" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "开始新的 Agent 对话" }));

    expect(onToggleThreadList).toHaveBeenCalledTimes(1);
    expect(onStartNewThread).toHaveBeenCalledTimes(1);

    rerender(
      <AgentConversationHeaderActions
        threadListOpen
        disabled
        onToggleThreadList={onToggleThreadList}
        onStartNewThread={onStartNewThread}
      />,
    );

    expect(
      screen.getByRole("button", { name: "返回当前 Agent 对话" }),
    ).toHaveTextContent("返回");
    expect(screen.getByRole("button", { name: "返回当前 Agent 对话" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "开始新的 Agent 对话" })).toBeDisabled();
  });

  it("renders conversation summary with readable status labels", () => {
    const { rerender } = render(
      <AgentConversationSummary
        agentName="Codex ACP"
        title="优化 CNC 外观"
        status="running"
      />,
    );

    expect(screen.getByText("Codex ACP")).toBeInTheDocument();
    expect(screen.getByText("优化 CNC 外观")).toBeInTheDocument();
    expect(screen.getByText("运行中")).toHaveClass(
      "agent-conversation-sidebar__status--running",
    );

    rerender(
      <AgentConversationSummary
        agentName="Codex ACP"
        title="优化 CNC 外观"
        status="completed"
      />,
    );

    expect(screen.getByText("已完成")).toHaveClass(
      "agent-conversation-sidebar__status--completed",
    );
  });
});
