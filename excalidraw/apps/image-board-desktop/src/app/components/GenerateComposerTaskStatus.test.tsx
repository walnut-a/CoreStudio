import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateComposerTaskStatus } from "./GenerateComposerTaskStatus";

describe("GenerateComposerTaskStatus", () => {
  it("renders nothing without an Agent task status", () => {
    const { container } = render(
      <GenerateComposerTaskStatus
        status={null}
        events={[]}
        onOpenAgentRunLog={vi.fn()}
        onStopInputEvent={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders task summary and opens the saved log", () => {
    const onOpenAgentRunLog = vi.fn();
    const onStopInputEvent = vi.fn();

    render(
      <GenerateComposerTaskStatus
        status={{
          taskId: "task-1",
          status: "completed",
          message: "Agent 已完成",
          transcript: "生成了一张图片",
          logPath: "/tmp/corestudio-agent-task.jsonl",
        }}
        events={[]}
        onOpenAgentRunLog={onOpenAgentRunLog}
        onStopInputEvent={onStopInputEvent}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Agent 已完成");
    expect(screen.getByRole("status")).toHaveTextContent("生成了一张图片");
    expect(screen.getByText("日志已保存")).toHaveAttribute(
      "title",
      "/tmp/corestudio-agent-task.jsonl",
    );

    fireEvent.click(screen.getByRole("button", { name: "查看保存日志" }));

    expect(onOpenAgentRunLog).toHaveBeenCalledWith("task-1");
    expect(onStopInputEvent).toHaveBeenCalledTimes(1);
  });

  it("renders a process shortcut when task events exist", () => {
    const onOpenAgentRunLog = vi.fn();

    render(
      <GenerateComposerTaskStatus
        status={{
          taskId: "task-2",
          status: "running",
          message: "Agent 运行中",
        }}
        events={[
          {
            id: "event-1",
            title: "读取选区",
          },
        ]}
        onOpenAgentRunLog={onOpenAgentRunLog}
        onStopInputEvent={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "查看任务过程" }));

    expect(onOpenAgentRunLog).toHaveBeenCalledWith("task-2");
  });

  it("does not render log actions without a task id", () => {
    render(
      <GenerateComposerTaskStatus
        status={{
          status: "completed",
          message: "Agent 已完成",
          logPath: "/tmp/corestudio-agent-task.jsonl",
        }}
        events={[
          {
            id: "event-1",
            title: "写回结果",
          },
        ]}
        onOpenAgentRunLog={vi.fn()}
        onStopInputEvent={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "查看保存日志" })).toBeNull();
    expect(screen.queryByRole("button", { name: "查看任务过程" })).toBeNull();
  });
});
