import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AcpThreadSummary } from "../../shared/acpTypes";
import { AgentThreadList } from "./AgentThreadList";

const summaries: AcpThreadSummary[] = [
  {
    threadId: "thread-1",
    projectToken: "project-1",
    projectName: "工业设计助手",
    agentName: "Codex ACP",
    title: "优化 CNC 外观",
    status: "running",
    createdAt: "2026-06-29T00:59:00.000Z",
    updatedAt: "2026-06-29T01:00:00.000Z",
    taskIds: ["task-1", "task-2"],
  },
  {
    threadId: "thread-2",
    projectToken: "project-1",
    projectName: "工业设计助手",
    agentName: "Codex ACP",
    title: "",
    status: "completed",
    createdAt: "2026-06-29T00:50:00.000Z",
    updatedAt: "bad-date",
    taskIds: ["task-3"],
  },
];

describe("AgentThreadList", () => {
  it("renders loading, error, and empty states quietly", () => {
    const onSelectThread = vi.fn();
    const { rerender } = render(
      <AgentThreadList
        summaries={[]}
        activeThreadId={null}
        loading
        onSelectThread={onSelectThread}
      />,
    );

    expect(screen.getByText("同步中")).toBeInTheDocument();

    rerender(
      <AgentThreadList
        summaries={[]}
        activeThreadId={null}
        error="读取失败"
        onSelectThread={onSelectThread}
      />,
    );
    expect(screen.getByText("读取失败")).toBeInTheDocument();

    rerender(
      <AgentThreadList
        summaries={[]}
        activeThreadId={null}
        onSelectThread={onSelectThread}
      />,
    );
    expect(screen.getByText("暂无历史对话")).toBeInTheDocument();
  });

  it("renders thread summaries with active state and status metadata", () => {
    render(
      <AgentThreadList
        summaries={summaries}
        activeThreadId="thread-1"
        onSelectThread={vi.fn()}
      />,
    );

    const list = screen.getByText("优化 CNC 外观").closest("div");
    expect(list).not.toBeNull();
    expect(screen.getByRole("button", { name: /优化 CNC 外观/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /未命名对话/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(within(list!).getByText(/运行中/)).toBeInTheDocument();
    expect(within(list!).getByText(/已完成/)).toBeInTheDocument();
  });

  it("reports selected thread ids", () => {
    const onSelectThread = vi.fn();

    render(
      <AgentThreadList
        summaries={summaries}
        activeThreadId="thread-1"
        onSelectThread={onSelectThread}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /未命名对话/ }));

    expect(onSelectThread).toHaveBeenCalledWith("thread-2");
  });

  it("disables thread actions while thread state is busy", () => {
    render(
      <AgentThreadList
        summaries={summaries}
        activeThreadId="thread-1"
        actionsDisabled
        onSelectThread={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /优化 CNC 外观/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /未命名对话/ })).toBeDisabled();
  });
});
