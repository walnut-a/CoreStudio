import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AcpRunSummary } from "../../shared/acpTypes";
import { setActiveDesktopLocale } from "../copy";
import {
  AcpDebugSettingsPanel,
  getAcpRunStatusLabel,
} from "./AcpDebugSettingsPanel";

const recentRun: AcpRunSummary = {
  mode: "acp-agent",
  taskId: "task-recent-1",
  threadId: "thread-1",
  projectToken: "project-token",
  projectName: "工业设计助手",
  agentName: "Codex ACP",
  userPrompt: "优化桌面 CNC 机器外观",
  status: "failed",
  startedAt: "2026-06-29T08:00:00.000Z",
  endedAt: "2026-06-29T08:00:05.000Z",
  lastMessage: "Agent 返回了中间过程。",
  errorMessage: "生成任务失败",
  logFile: "/tmp/corestudio-agent-runs/task-recent-1.ndjson",
};

const renderPanel = (
  overrides: Partial<Parameters<typeof AcpDebugSettingsPanel>[0]> = {},
) => {
  const props: Parameters<typeof AcpDebugSettingsPanel>[0] = {
    open: true,
    summaries: [recentRun],
    loading: false,
    error: null,
    canReadRunLogs: true,
    onOpenChange: vi.fn(),
    onRefresh: vi.fn(),
    onOpenRunLog: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<AcpDebugSettingsPanel {...props} />),
  };
};

afterEach(() => {
  setActiveDesktopLocale("zh-CN");
});

describe("AcpDebugSettingsPanel", () => {
  it("keeps run summaries out of the normal settings surface while collapsed", () => {
    renderPanel({
      open: false,
    });

    expect(screen.getByText("高级调试")).toBeInTheDocument();
    expect(screen.queryByText("ACP 调试记录")).not.toBeInTheDocument();
    expect(screen.queryByText("工业设计助手")).not.toBeInTheDocument();
    expect(screen.queryByText("优化桌面 CNC 机器外观")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "刷新记录" }),
    ).not.toBeInTheDocument();
  });

  it("renders ACP run summaries and opens a selected run log", () => {
    const onOpenRunLog = vi.fn();
    renderPanel({
      onOpenRunLog,
    });

    const history = screen
      .getByText("ACP 调试记录")
      .closest(".acp-run-history");
    expect(history).not.toBeNull();
    const controls = within(history as HTMLElement);

    expect(controls.getByText("工业设计助手")).toBeInTheDocument();
    expect(controls.getByText("优化桌面 CNC 机器外观")).toBeInTheDocument();
    expect(controls.getByText("失败")).toBeInTheDocument();
    expect(controls.getByText("生成任务失败")).toBeInTheDocument();

    fireEvent.click(
      controls.getByRole("button", {
        name: "查看调试记录：优化桌面 CNC 机器外观",
      }),
    );

    expect(onOpenRunLog).toHaveBeenCalledWith("task-recent-1");
  });

  it("labels the debug section as troubleshooting rather than normal history", () => {
    renderPanel();

    expect(
      screen.getByText("排障时查看 ACP 调试记录、协议 JSON 和任务包。"),
    ).toBeInTheDocument();
  });

  it("reports open state and refresh actions", () => {
    const onOpenChange = vi.fn();
    renderPanel({
      open: false,
      onOpenChange,
    });

    const details = screen.getByText("高级调试").closest("details");
    expect(details).not.toBeNull();
    (details as HTMLDetailsElement).open = true;
    fireEvent(details as HTMLDetailsElement, new Event("toggle"));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("refreshes run logs only after the debug section is expanded", () => {
    const onRefresh = vi.fn();
    renderPanel({
      open: true,
      onRefresh,
    });

    fireEvent.click(screen.getByRole("button", { name: "刷新记录" }));

    expect(onRefresh).toHaveBeenCalled();
  });

  it("renders loading, error, and unsupported states", () => {
    renderPanel({
      summaries: [],
      loading: true,
      error: "读取失败",
      canReadRunLogs: false,
    });

    expect(screen.getByRole("button", { name: "读取中..." })).toBeDisabled();
    expect(screen.getByText("读取失败")).toBeInTheDocument();
    expect(
      screen.getByText("当前环境暂不支持读取 ACP 调试记录。"),
    ).toBeInTheDocument();
  });

  it("uses stable labels for all ACP run statuses", () => {
    expect(getAcpRunStatusLabel("running")).toBe("运行中");
    expect(getAcpRunStatusLabel("completed")).toBe("已完成");
    expect(getAcpRunStatusLabel("failed")).toBe("失败");
    expect(getAcpRunStatusLabel("cancelled")).toBe("已取消");
  });

  it("renders debug controls and statuses from the English catalog", () => {
    setActiveDesktopLocale("en");
    renderPanel();

    expect(screen.getByText("Advanced Debugging")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh Logs" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.queryByText("高级调试")).not.toBeInTheDocument();
  });
});
