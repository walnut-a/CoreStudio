import { describe, expect, it, vi } from "vitest";

import {
  App,
  act,
  createDesktopBridgeMock,
  fireEvent,
  render,
  screen,
  triggerExcalidrawInitialize,
  waitFor,
  within,
} from "./App.testSupport";

describe("App ACP run log", () => {
  it("opens saved ACP Agent run log details from the current task", async () => {
    let acpTaskListener:
      | ((event: {
          taskId: string;
          type: "status";
          status: "failed";
          message: string;
          logPath: string;
        }) => void)
      | null = null;
    const startAcpAgentTask = vi.fn().mockResolvedValue({ taskId: "task-1" });
    const readAcpAgentRunLog = vi.fn(async () => ({
      summary: {
        taskId: "task-1",
        projectToken: "project-token",
        projectName: "测试项目",
        agentName: "测试 Agent",
        userPrompt: "继续细化工业设计方案",
        mode: "acp-agent",
        status: "failed",
        startedAt: "2026-06-29T01:00:00.000Z",
        endedAt: "2026-06-29T01:01:00.000Z",
        errorMessage: "No model configured",
        logFile: "task-1.jsonl",
      },
      entries: [
        {
          version: 1,
          taskId: "task-1",
          timestamp: "2026-06-29T01:00:00.000Z",
          seq: 1,
          kind: "task.created",
          payload: { projectName: "测试项目" },
        },
        {
          version: 1,
          taskId: "task-1",
          timestamp: "2026-06-29T01:00:10.000Z",
          seq: 2,
          kind: "agent.message",
          payload: { text: "正在分析当前画板。" },
        },
        {
          version: 1,
          taskId: "task-1",
          timestamp: "2026-06-29T01:00:20.000Z",
          seq: 3,
          kind: "acp.request",
          payload: { method: "session/prompt" },
        },
        {
          version: 1,
          taskId: "task-1",
          timestamp: "2026-06-29T01:00:30.000Z",
          seq: 4,
          kind: "error",
          payload: { message: "No model configured" },
        },
      ],
    }));
    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: true,
        ready: true,
        currentProject: null,
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
      })),
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "测试 Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: null,
          },
        ],
      })),
      startAcpAgentTask,
      readAcpAgentRunLog,
      onAcpAgentTaskEvent: vi.fn((listener) => {
        acpTaskListener = listener as typeof acpTaskListener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "提交 ACP Agent 生成" }),
      );
    });

    await waitFor(() => {
      expect(startAcpAgentTask).toHaveBeenCalled();
    });
    const taskId = startAcpAgentTask.mock.calls[0][0].taskId;
    act(() => {
      acpTaskListener?.({
        taskId,
        type: "status",
        status: "failed",
        message: "Agent 任务失败",
        logPath:
          "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-runs/task-1.jsonl",
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "查看保存日志" }));
    });

    await waitFor(() => {
      expect(readAcpAgentRunLog).toHaveBeenCalledWith(taskId);
    });
    await waitFor(() => {
      expect(screen.getByTestId("side-dock-left")).toHaveAttribute(
        "data-open",
        "true",
      );
    });
    const agentDockElement = screen.getByTestId("side-dock-left");
    const agentDock = within(agentDockElement);
    expect(agentDock.getByText("测试 Agent")).toBeInTheDocument();
    expect(
      agentDock.getByRole("log", {
        name: "Agent 对话时间线",
      }),
    ).toHaveTextContent("继续细化工业设计方案");
    expect(agentDock.getByText("正在分析当前画板。")).toBeInTheDocument();
    expect(
      agentDock.getAllByText(/No model configured/).length,
    ).toBeGreaterThan(0);
    expect(agentDock.queryByText(/acp\.request/)).toBeNull();
    expect(
      agentDock.queryByRole("button", { name: "显示原始事件" }),
    ).toBeNull();
    expect(agentDock.queryByText(/session\/prompt/)).toBeNull();
  });

  it("refreshes an open ACP Agent run log when the current task finishes", async () => {
    let acpTaskListener:
      | ((event: {
          taskId: string;
          type: "status";
          status: "connecting" | "completed";
          message: string;
          logPath?: string;
        }) => void)
      | null = null;
    const startAcpAgentTask = vi.fn().mockResolvedValue({ taskId: "task-1" });
    const readAcpAgentRunLog = vi
      .fn()
      .mockResolvedValueOnce({
        summary: {
          taskId: "task-1",
          projectToken: "project-token",
          projectName: "测试项目",
          agentName: "测试 Agent",
          userPrompt: "继续细化工业设计方案",
          mode: "acp-agent",
          status: "running",
          startedAt: "2026-06-29T01:00:00.000Z",
          logFile: "task-1.jsonl",
        },
        entries: [
          {
            version: 1,
            taskId: "task-1",
            timestamp: "2026-06-29T01:00:00.000Z",
            seq: 1,
            kind: "task.created",
            payload: { userPrompt: "继续细化工业设计方案" },
          },
        ],
      })
      .mockResolvedValueOnce({
        summary: {
          taskId: "task-1",
          projectToken: "project-token",
          projectName: "测试项目",
          agentName: "测试 Agent",
          userPrompt: "继续细化工业设计方案",
          mode: "acp-agent",
          status: "completed",
          startedAt: "2026-06-29T01:00:00.000Z",
          endedAt: "2026-06-29T01:01:00.000Z",
          lastMessage: "Agent 已完成",
          logFile: "task-1.jsonl",
        },
        entries: [
          {
            version: 1,
            taskId: "task-1",
            timestamp: "2026-06-29T01:00:00.000Z",
            seq: 1,
            kind: "task.created",
            payload: { userPrompt: "继续细化工业设计方案" },
          },
          {
            version: 1,
            taskId: "task-1",
            timestamp: "2026-06-29T01:00:10.000Z",
            seq: 2,
            kind: "agent.message",
            payload: { text: "已生成新图片并写回画板。" },
          },
          {
            version: 1,
            taskId: "task-1",
            timestamp: "2026-06-29T01:01:00.000Z",
            seq: 3,
            kind: "task.finished",
            payload: { status: "completed", lastMessage: "Agent 已完成" },
          },
        ],
      });
    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: true,
        ready: true,
        currentProject: null,
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
      })),
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "测试 Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: null,
          },
        ],
      })),
      startAcpAgentTask,
      readAcpAgentRunLog,
      onAcpAgentTaskEvent: vi.fn((listener) => {
        acpTaskListener = listener as typeof acpTaskListener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "提交 ACP Agent 生成" }),
      );
    });

    await waitFor(() => {
      expect(startAcpAgentTask).toHaveBeenCalled();
    });
    const taskId = startAcpAgentTask.mock.calls[0][0].taskId;
    act(() => {
      acpTaskListener?.({
        taskId,
        type: "status",
        status: "connecting",
        message: "正在连接 ACP Agent",
        logPath:
          "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-runs/task-1.jsonl",
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "查看保存日志" }));
    });

    const agentDock = within(screen.getByTestId("side-dock-left"));
    expect(
      agentDock.getByRole("log", { name: "Agent 对话时间线" }),
    ).toHaveTextContent("继续细化工业设计方案");

    act(() => {
      acpTaskListener?.({
        taskId,
        type: "status",
        status: "completed",
        message: "Agent 已完成",
      });
    });

    await waitFor(() => {
      expect(readAcpAgentRunLog).toHaveBeenCalledTimes(2);
    });
    expect(agentDock.getByText("已生成新图片并写回画板。")).toBeInTheDocument();
    expect(agentDock.getAllByText("Agent 已完成").length).toBeGreaterThan(0);
  });

  it("retries opening the saved ACP Agent run log while the log is still being finalized", async () => {
    let acpTaskListener:
      | ((event: {
          taskId: string;
          type: "status";
          status: "failed";
          message: string;
          logPath: string;
        }) => void)
      | null = null;
    const startAcpAgentTask = vi.fn().mockResolvedValue({ taskId: "task-1" });
    const readAcpAgentRunLog = vi
      .fn()
      .mockRejectedValueOnce(new Error("ACP run log not found: task-1"))
      .mockResolvedValueOnce({
        summary: {
          taskId: "task-1",
          projectToken: "project-token",
          projectName: "测试项目",
          agentName: "测试 Agent",
          userPrompt: "继续细化工业设计方案",
          mode: "acp-agent",
          status: "failed",
          startedAt: "2026-06-29T01:00:00.000Z",
          endedAt: "2026-06-29T01:01:00.000Z",
          errorMessage: "No model configured",
          logFile: "task-1.jsonl",
        },
        entries: [
          {
            version: 1,
            taskId: "task-1",
            timestamp: "2026-06-29T01:00:00.000Z",
            seq: 1,
            kind: "error",
            payload: { message: "No model configured" },
          },
        ],
      });
    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: true,
        ready: true,
        currentProject: null,
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
      })),
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "测试 Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: null,
          },
        ],
      })),
      startAcpAgentTask,
      readAcpAgentRunLog,
      onAcpAgentTaskEvent: vi.fn((listener) => {
        acpTaskListener = listener as typeof acpTaskListener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "提交 ACP Agent 生成" }),
      );
    });

    await waitFor(() => {
      expect(startAcpAgentTask).toHaveBeenCalled();
    });
    const taskId = startAcpAgentTask.mock.calls[0][0].taskId;
    act(() => {
      acpTaskListener?.({
        taskId,
        type: "status",
        status: "failed",
        message: "Agent 任务失败",
        logPath:
          "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-runs/task-1.jsonl",
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "查看保存日志" }));
    });

    await waitFor(() => {
      expect(readAcpAgentRunLog).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId("side-dock-left")).toHaveTextContent(
      "No model configured",
    );
  });
});
