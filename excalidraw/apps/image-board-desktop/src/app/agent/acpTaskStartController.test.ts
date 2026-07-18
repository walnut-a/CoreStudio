import { describe, expect, it, vi } from "vitest";

import {
  createAcpTaskStartRendererActions,
  runAcpTaskStart,
  runAcpTaskStartRendererAction,
} from "./acpTaskStartController";

import type {
  DesktopAgentBridgeStatus,
  DesktopProjectBundle,
} from "../../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../../shared/providerTypes";
import type { AgentIntegrationViewModel } from "./agentIntegrationViewModel";

const createRequest = (): GenerationRequest => ({
  generationSource: "agent",
  provider: "gemini",
  model: "gemini-image",
  prompt: "优化这台机器",
  width: 1024,
  height: 1024,
  imageCount: 1,
  reference: null,
});

const createProject = (): DesktopProjectBundle => ({
  projectPath: "/Projects/CoreStudio/工业设计助手",
  sceneJson: "{}",
  imageRecords: {},
  project: {
    formatVersion: 1,
    appVersion: "1.0.0",
    name: "工业设计助手",
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      enabled: true,
      token: "project-token",
    },
  },
});

const createStatus = (): DesktopAgentBridgeStatus => ({
  enabled: true,
  ready: true,
  boardUrl:
    "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=project-token",
  currentProject: {
    name: "工业设计助手",
    projectPath: "/Projects/CoreStudio/工业设计助手",
    agentAccess: {
      enabled: true,
      token: "project-token",
    },
  },
});

const createRuntime = (
  patch: Partial<AgentIntegrationViewModel["acp"]> = {},
) => ({
  acpGeneration: {
    ready: true,
  },
  integration: {
    acp: {
      agentId: "codex",
      ...patch,
    },
  },
});

describe("runAcpTaskStart", () => {
  it("skips when no project is open", async () => {
    const startAcpAgentTask = vi.fn();
    const applyStartState = vi.fn();
    const clearSubmittedPrompt = vi.fn();

    await expect(
      runAcpTaskStart({
        request: createRequest(),
        project: null,
        runtime: createRuntime(),
        activeThreadId: null,
        status: createStatus(),
        pageUrl: "http://127.0.0.1:5174/",
        bridge: { startAcpAgentTask },
        createThreadId: () => "thread-1",
        createTaskId: () => "task-1",
        applyStartState,
        clearSubmittedPrompt,
      }),
    ).resolves.toEqual({ status: "skipped" });

    expect(startAcpAgentTask).not.toHaveBeenCalled();
    expect(applyStartState).not.toHaveBeenCalled();
    expect(clearSubmittedPrompt).not.toHaveBeenCalled();
  });

  it("throws the setup error when ACP Agent generation is unavailable", async () => {
    await expect(
      runAcpTaskStart({
        request: createRequest(),
        project: createProject(),
        runtime: createRuntime({ agentId: null }),
        activeThreadId: null,
        status: createStatus(),
        pageUrl: "http://127.0.0.1:5174/",
        bridge: { startAcpAgentTask: vi.fn() },
        createThreadId: () => "thread-1",
        createTaskId: () => "task-1",
        applyStartState: vi.fn(),
        clearSubmittedPrompt: vi.fn(),
      }),
    ).rejects.toThrow("请先开启 Agent 集成，并在应用设置里配置 ACP Agent。");
  });

  it("applies start UI state, starts the bridge task, and clears the submitted prompt", async () => {
    const startAcpAgentTask = vi.fn().mockResolvedValue({
      taskId: "task-1",
      threadId: "thread-1",
    });
    const applyStartState = vi.fn();
    const clearSubmittedPrompt = vi.fn();

    await expect(
      runAcpTaskStart({
        request: createRequest(),
        project: createProject(),
        runtime: createRuntime(),
        activeThreadId: null,
        status: createStatus(),
        pageUrl: "http://127.0.0.1:5174/",
        bridge: { startAcpAgentTask },
        createThreadId: () => "thread-1",
        createTaskId: () => "task-1",
        applyStartState,
        clearSubmittedPrompt,
      }),
    ).resolves.toEqual({
      status: "started",
      taskId: "task-1",
      threadId: "thread-1",
    });

    expect(applyStartState).toHaveBeenCalledWith(
      expect.objectContaining({
        activeTaskId: "task-1",
        activeThreadId: "thread-1",
        runLogTaskId: "task-1",
        chatDockOpen: true,
      }),
    );
    expect(startAcpAgentTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "task-1",
        threadId: "thread-1",
        agentId: "codex",
        userPrompt: "优化这台机器",
      }),
    );
    expect(clearSubmittedPrompt).toHaveBeenCalledTimes(1);
  });

  it("preserves the ACP draft when the bridge cannot start the task", async () => {
    const clearSubmittedPrompt = vi.fn();

    await expect(
      runAcpTaskStart({
        request: createRequest(),
        project: createProject(),
        runtime: createRuntime(),
        activeThreadId: null,
        status: createStatus(),
        pageUrl: "http://127.0.0.1:5174/",
        bridge: {
          startAcpAgentTask: vi.fn().mockRejectedValue(new Error("连接失败")),
        },
        createThreadId: () => "thread-1",
        createTaskId: () => "task-1",
        applyStartState: vi.fn(),
        clearSubmittedPrompt,
      }),
    ).rejects.toThrow("连接失败");

    expect(clearSubmittedPrompt).not.toHaveBeenCalled();
  });
});

describe("runAcpTaskStartRendererAction", () => {
  it("starts an ACP task and applies renderer state through injected setters", async () => {
    const startAcpAgentTask = vi.fn().mockResolvedValue({
      taskId: "task-1",
      threadId: "thread-1",
    });
    const setActiveTaskId = vi.fn();
    const setActiveThreadId = vi.fn();
    const setRunLogTaskId = vi.fn();
    const setRunLogSurface = vi.fn();
    const setChatDockOpen = vi.fn();
    const setRunLogDetail = vi.fn();
    const setRunLogError = vi.fn();
    const setRunLogRawOpen = vi.fn();
    const setAgentTask = vi.fn();
    const setGenerateRequest = vi.fn();

    await expect(
      runAcpTaskStartRendererAction({
        request: createRequest(),
        project: createProject(),
        runtime: createRuntime(),
        getActiveThreadId: () => "thread-current",
        status: createStatus(),
        pageUrl: "http://127.0.0.1:5174/",
        bridge: { startAcpAgentTask },
        createThreadId: () => "thread-new",
        createTaskId: () => "task-1",
        setActiveTaskId,
        setActiveThreadId,
        runLogTargetActions: {
        setTaskId: setRunLogTaskId,
        setSurface: setRunLogSurface,
      },
        setChatDockOpen,
        setRunLogDetail,
        setRunLogError,
        setRunLogRawOpen,
        setAgentTask,
        setGenerateRequest,
      }),
    ).resolves.toEqual({
      status: "started",
      taskId: "task-1",
      threadId: "thread-current",
    });

    expect(setActiveTaskId).toHaveBeenCalledWith("task-1");
    expect(setActiveThreadId).toHaveBeenCalledWith("thread-current");
    expect(setRunLogTaskId).toHaveBeenCalledWith("task-1");
    expect(setRunLogSurface).toHaveBeenCalledWith("conversation");
    expect(setChatDockOpen).toHaveBeenCalledWith(true);
    expect(setRunLogDetail).toHaveBeenCalledWith(null);
    expect(setRunLogError).toHaveBeenCalledWith(null);
    expect(setRunLogRawOpen).toHaveBeenCalledWith(false);
    expect(setAgentTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "task-1",
        status: "connecting",
        message: "正在连接 ACP Agent",
      }),
    );
    expect(setGenerateRequest).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe("createAcpTaskStartRendererActions", () => {
  it("creates a start action that reads the latest renderer state", async () => {
    const startAcpAgentTask = vi.fn().mockResolvedValue({
      taskId: "task-1",
      threadId: "thread-latest",
    });
    let activeThreadId = "thread-initial";
    const actions = createAcpTaskStartRendererActions({
      getProject: createProject,
      getRuntime: createRuntime,
      getStatus: createStatus,
      getPageUrl: () => "http://127.0.0.1:5174/",
      getBridge: () => ({ startAcpAgentTask }),
      getActiveThreadId: () => activeThreadId,
      createThreadId: () => "thread-new",
      createTaskId: () => "task-1",
      setActiveTaskId: vi.fn(),
      setActiveThreadId: vi.fn(),
      runLogTargetActions: {
        setTaskId: vi.fn(),
        setSurface: vi.fn(),
      },
      setChatDockOpen: vi.fn(),
      setRunLogDetail: vi.fn(),
      setRunLogError: vi.fn(),
      setRunLogRawOpen: vi.fn(),
      setAgentTask: vi.fn(),
      setGenerateRequest: vi.fn(),
    });

    activeThreadId = "thread-latest";
    await actions.start(createRequest());

    expect(startAcpAgentTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "task-1",
        threadId: "thread-latest",
      }),
    );
  });
});
