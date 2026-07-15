import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AcpRunLogDetail } from "../../shared/acpTypes";
import { setActiveDesktopLocale } from "../copy";
import { AcpRunLogDialog } from "./AcpRunLogDialog";

const runLogDetail: AcpRunLogDetail = {
  summary: {
    mode: "acp-agent",
    taskId: "task-1",
    threadId: "thread-1",
    projectToken: "project-token",
    projectName: "工业设计助手",
    agentName: "Codex ACP",
    userPrompt: "优化桌面 CNC 机器",
    status: "completed",
    startedAt: "2026-06-29T08:00:00.000Z",
    endedAt: "2026-06-29T08:00:05.000Z",
    logFile: "/tmp/corestudio-agent-runs/task-1.ndjson",
  },
  entries: [
    {
      version: 1,
      taskId: "task-1",
      timestamp: "2026-06-29T08:00:01.000Z",
      seq: 1,
      kind: "agent.message",
      payload: { text: "我会先读取当前项目状态。" },
    },
  ],
};

const renderDialog = (
  overrides: Partial<Parameters<typeof AcpRunLogDialog>[0]> = {},
) => {
  const props: Parameters<typeof AcpRunLogDialog>[0] = {
    open: true,
    loading: false,
    error: null,
    detail: runLogDetail,
    rawOpen: false,
    onRawOpenChange: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<AcpRunLogDialog {...props} />),
  };
};

describe("AcpRunLogDialog", () => {
  afterEach(() => {
    setActiveDesktopLocale("zh-CN");
  });

  it("does not render while closed", () => {
    renderDialog({ open: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders run summary and chat log entries", () => {
    renderDialog();

    expect(
      screen.getByRole("dialog", { name: "Agent 任务记录" }),
    ).toBeInTheDocument();
    expect(screen.getByText("task-1")).toBeInTheDocument();
    expect(screen.getByText("Codex ACP")).toBeInTheDocument();
    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.getByText("工业设计助手")).toBeInTheDocument();
    expect(screen.getByText("我会先读取当前项目状态。")).toBeInTheDocument();
  });

  it("renders loading and error states without losing the dialog shell", () => {
    renderDialog({
      loading: true,
      error: "读取失败",
      detail: null,
    });

    expect(screen.getByText("正在读取任务记录…")).toBeInTheDocument();
    expect(screen.getByText("读取失败")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("toggles raw protocol entries through a controlled callback", () => {
    const onRawOpenChange = vi.fn();
    const { rerender, props } = renderDialog({ onRawOpenChange });

    fireEvent.click(screen.getByRole("button", { name: "显示协议 JSON" }));

    expect(onRawOpenChange).toHaveBeenCalledWith(true);

    rerender(
      <AcpRunLogDialog {...props} rawOpen onRawOpenChange={onRawOpenChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "隐藏协议 JSON" }));

    expect(onRawOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes through the header action", () => {
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("localizes dialog controls without rewriting run content", () => {
    setActiveDesktopLocale("en");

    renderDialog();

    expect(
      screen.getByRole("dialog", { name: "Agent task log" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Project")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("工业设计助手")).toBeInTheDocument();
    expect(screen.getByText("我会先读取当前项目状态。")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show protocol JSON" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
