import { describe, expect, it, vi } from "vitest";

import type { AcpTaskRequest } from "../../shared/acpTypes";
import {
  buildAcpTaskStartPlanFromRuntime,
  buildAcpTaskStartPlan,
  canStartAcpAgentTask,
  startAcpAgentTaskRequest,
} from "./acpTaskStarter";

const createTaskRequest = (): AcpTaskRequest => ({
  taskId: "acp-task-1",
  threadId: "acp-thread-1",
  agentId: "codex",
  userPrompt: "优化参考图",
  project: {
    name: "工业设计助手",
    projectPath: "/Projects/工业设计助手",
    token: "project-token",
    bridgeBaseUrl: "http://127.0.0.1:60909",
    boardUrl: "http://127.0.0.1:5174/agent-board",
  },
  generation: {
    source: "agent",
  },
  selection: {
    elementCount: 1,
    items: [
      {
        index: 1,
        elementId: "element-1",
        kind: "image",
        fileId: "file-1",
        imageId: "image-1",
        label: "参考图",
      },
    ],
  },
});

describe("canStartAcpAgentTask", () => {
  it("reports false when bridge is missing the task starter", () => {
    expect(canStartAcpAgentTask(null)).toBe(false);
    expect(canStartAcpAgentTask({})).toBe(false);
  });

  it("reports true when bridge can start ACP tasks", () => {
    expect(
      canStartAcpAgentTask({
        startAcpAgentTask: vi.fn(),
      }),
    ).toBe(true);
  });
});

describe("buildAcpTaskStartPlan", () => {
  it("skips task start when no project is open", () => {
    expect(
      buildAcpTaskStartPlan({
        hasProject: false,
        generationReady: true,
        selectedAgentId: "codex",
        activeThreadId: null,
        createThreadId: () => "new-thread",
      }),
    ).toEqual({ action: "skip" });
  });

  it("returns a product-facing setup error when ACP generation is unavailable", () => {
    expect(
      buildAcpTaskStartPlan({
        hasProject: true,
        generationReady: false,
        selectedAgentId: "codex",
        activeThreadId: null,
        createThreadId: () => "new-thread",
      }),
    ).toEqual({
      action: "unavailable",
      error: "请先开启 Agent 集成，并在应用设置里配置 ACP Agent。",
    });
    expect(
      buildAcpTaskStartPlan({
        hasProject: true,
        generationReady: true,
        selectedAgentId: null,
        activeThreadId: null,
        createThreadId: () => "new-thread",
      }),
    ).toEqual({
      action: "unavailable",
      error: "请先开启 Agent 集成，并在应用设置里配置 ACP Agent。",
    });
  });

  it("reuses the active ACP thread when one is already selected", () => {
    expect(
      buildAcpTaskStartPlan({
        hasProject: true,
        generationReady: true,
        selectedAgentId: "codex",
        activeThreadId: "existing-thread",
        createThreadId: () => "new-thread",
      }),
    ).toEqual({
      action: "start",
      agentId: "codex",
      threadId: "existing-thread",
    });
  });

  it("creates a new ACP thread when there is no active thread", () => {
    expect(
      buildAcpTaskStartPlan({
        hasProject: true,
        generationReady: true,
        selectedAgentId: "codex",
        activeThreadId: null,
        createThreadId: () => "new-thread",
      }),
    ).toEqual({
      action: "start",
      agentId: "codex",
      threadId: "new-thread",
    });
  });
});

describe("buildAcpTaskStartPlanFromRuntime", () => {
  it("builds the start plan from the shared Agent integration runtime state", () => {
    expect(
      buildAcpTaskStartPlanFromRuntime({
        hasProject: true,
        runtime: {
          acpGeneration: {
            ready: true,
          },
          integration: {
            acp: {
              agentId: "codex",
            },
          },
        },
        activeThreadId: "thread-1",
        createThreadId: () => "new-thread",
      }),
    ).toEqual({
      action: "start",
      agentId: "codex",
      threadId: "thread-1",
    });
  });

  it("keeps the existing setup error when runtime state is not ready", () => {
    expect(
      buildAcpTaskStartPlanFromRuntime({
        hasProject: true,
        runtime: {
          acpGeneration: {
            ready: false,
          },
          integration: {
            acp: {
              agentId: "codex",
            },
          },
        },
        activeThreadId: null,
        createThreadId: () => "new-thread",
      }),
    ).toEqual({
      action: "unavailable",
      error: "请先开启 Agent 集成，并在应用设置里配置 ACP Agent。",
    });
  });
});

describe("startAcpAgentTaskRequest", () => {
  it("throws a product-facing error when task starter is unavailable", async () => {
    await expect(
      startAcpAgentTaskRequest({
        bridge: {},
        request: createTaskRequest(),
      }),
    ).rejects.toThrow("当前环境不能直接发起 ACP Agent 任务。");
  });

  it("starts the task through the bridge and returns the task identity", async () => {
    const request = createTaskRequest();
    const startAcpAgentTask = vi.fn().mockResolvedValue({
      taskId: request.taskId,
      threadId: request.threadId,
    });

    await expect(
      startAcpAgentTaskRequest({
        bridge: { startAcpAgentTask },
        request,
      }),
    ).resolves.toEqual({
      taskId: request.taskId,
      threadId: request.threadId,
    });
    expect(startAcpAgentTask).toHaveBeenCalledWith(request);
  });

  it("propagates bridge failures so App can keep existing failure handling", async () => {
    const request = createTaskRequest();
    const error = new Error("agent failed");

    await expect(
      startAcpAgentTaskRequest({
        bridge: {
          startAcpAgentTask: vi.fn().mockRejectedValue(error),
        },
        request,
      }),
    ).rejects.toBe(error);
  });
});
