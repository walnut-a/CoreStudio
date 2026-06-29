import { describe, expect, it, vi } from "vitest";

import { createAcpSessionClient } from "./acpSessionClient";

import type { AcpAgentProcess } from "./acpAgentProcess";
import type { AcpTaskRequest } from "../../src/shared/acpTypes";

const createTaskRequest = (
  overrides: Partial<AcpTaskRequest> = {},
): AcpTaskRequest => ({
  taskId: "task-1",
  agentId: "agent-1",
  userPrompt: "优化这台机器的设计",
  project: {
    name: "工业设计助手",
    projectPath: "/Users/zhaolixing/Documents/工业设计助手",
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
        imageId: "img-1",
        label: "图片",
      },
    ],
  },
  ...overrides,
});

const createFakeProcess = (
  initializeResult: unknown = {
    protocolVersion: 1,
    agentCapabilities: {
      promptCapabilities: {
        embeddedContext: true,
      },
    },
  },
) => {
  const notificationListeners = new Set<
    (method: string, params: unknown) => void
  >();
  const request = vi.fn(async (method: string, params?: unknown) => {
    if (method === "initialize") {
      return initializeResult;
    }
    if (method === "session/new") {
      return { sessionId: "session-1" };
    }
    if (method === "session/prompt") {
      for (const listener of notificationListeners) {
        listener("session/update", {
          sessionId: "session-1",
          update: {
            sessionUpdate: "agent_message_chunk",
            messageId: "message-1",
            content: {
              type: "text",
              text: "我会先分析当前选中的图片。",
            },
          },
        });
      }
      return { stopReason: "end_turn" };
    }
    return {};
  });
  const notify = vi.fn();
  const process: AcpAgentProcess = {
    jsonRpc: {
      request,
      notify,
      onNotification(listener) {
        notificationListeners.add(listener);
        return () => notificationListeners.delete(listener);
      },
      dispose: vi.fn(),
    },
    getRecentStderr: () => [],
    dispose: vi.fn(),
  };

  return { process, request, notify, notificationListeners };
};

describe("acpSessionClient", () => {
  it("initializes ACP, creates a session, and sends embedded CoreStudio context", async () => {
    const { process, request } = createFakeProcess();
    const events: unknown[] = [];
    const client = createAcpSessionClient({
      process,
      clientInfo: {
        name: "corestudio",
        title: "CoreStudio",
        version: "1.1.10",
      },
      onEvent: (event) => events.push(event),
    });

    await expect(client.runTask(createTaskRequest())).resolves.toEqual({
      stopReason: "end_turn",
    });

    expect(request).toHaveBeenNthCalledWith(1, "initialize", {
      protocolVersion: 1,
      clientCapabilities: {},
      clientInfo: {
        name: "corestudio",
        title: "CoreStudio",
        version: "1.1.10",
      },
    });
    expect(request).toHaveBeenNthCalledWith(2, "session/new", {
      cwd: "/Users/zhaolixing/Documents/工业设计助手",
      mcpServers: [],
    });
    const promptParams = request.mock.calls[2][1] as any;
    expect(promptParams.sessionId).toBe("session-1");
    expect(promptParams.prompt[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("优化这台机器的设计"),
    });
    expect(promptParams.prompt[0].text).toContain(
      "You are an external ACP Agent working with CoreStudio",
    );
    expect(promptParams.prompt[1]).toMatchObject({
      type: "resource",
      resource: {
        uri: "corestudio://task/context",
        mimeType: "application/json",
        text: expect.stringContaining("project-token"),
      },
    });
    const taskContext = JSON.parse(promptParams.prompt[1].resource.text);
    expect(taskContext).toMatchObject({
      schemaVersion: "corestudio.acpTask.v1",
      contract: {
        writeBack: {
          required: true,
          authority: "CoreStudio CLI / Local Bridge",
        },
      },
    });
    expect(taskContext.capabilities.cli.executable).toContain("corestudio.cjs");
    expect(taskContext.capabilities.cli.executable).not.toBe(
      "node bin/corestudio.cjs",
    );
    expect(taskContext.capabilities.cli.environment).toMatchObject({
      CORESTUDIO_AGENT_BRIDGE_URL: "http://127.0.0.1:60909",
      CORESTUDIO_AGENT_PROJECT_TOKEN: "project-token",
      CORESTUDIO_AGENT_TASK_ID: "task-1",
      CORESTUDIO_AGENT_USER_PROMPT: "优化这台机器的设计",
      CORESTUDIO_AGENT_REFERENCE_FILE_IDS: "file-1",
      CORESTUDIO_AGENT_REFERENCE_ELEMENT_IDS: "element-1",
    });
    expect(taskContext.capabilities.cli.examples[0]).toContain(
      taskContext.capabilities.cli.executable,
    );
    expect(taskContext.capabilities.cli.examples[0]).toContain(
      "CORESTUDIO_AGENT_PROJECT_TOKEN",
    );
    expect(taskContext.capabilities.cli.examples[3]).toContain(
      "--origin acp-agent",
    );
    expect(taskContext.capabilities.cli.examples[3]).toContain("--prompt");
    expect(request).toHaveBeenNthCalledWith(
      3,
      "session/prompt",
      expect.any(Object),
      expect.objectContaining({
        timeoutMs: expect.any(Number),
      }),
    );
    expect(events).toEqual(
      expect.arrayContaining([
        {
          taskId: "task-1",
          type: "agent-message",
          messageId: "message-1",
          text: "我会先分析当前选中的图片。",
        },
      ]),
    );
  });

  it("falls back to text context when embedded context is unsupported", async () => {
    const { process, request } = createFakeProcess({
      protocolVersion: 1,
      agentCapabilities: {
        promptCapabilities: {},
      },
    });
    const client = createAcpSessionClient({
      process,
      clientInfo: {
        name: "corestudio",
        title: "CoreStudio",
        version: "1.1.10",
      },
      onEvent: vi.fn(),
    });

    await client.runTask(createTaskRequest());

    const promptParams = request.mock.calls[2][1] as any;
    expect(promptParams.prompt).toHaveLength(1);
    expect(promptParams.prompt[0].text).toContain("CoreStudio 上下文");
    expect(promptParams.prompt[0].text).toContain("project-token");
    expect(promptParams.prompt[0].text).toContain(
      "You are an external ACP Agent working with CoreStudio",
    );
  });

  it("allows CoreStudio settings to override the default task instruction template", async () => {
    const { process, request } = createFakeProcess();
    const client = createAcpSessionClient({
      process,
      clientInfo: {
        name: "corestudio",
        title: "CoreStudio",
        version: "1.1.10",
      },
      taskInstructionTemplate: "请先分析参考图，再用 CLI 写回。",
      onEvent: vi.fn(),
    });

    await client.runTask(createTaskRequest());

    const promptParams = request.mock.calls[2][1] as any;
    expect(promptParams.prompt[0].text).toContain(
      "请先分析参考图，再用 CLI 写回。",
    );
  });

  it("filters Codex runtime warnings from agent transcript", async () => {
    const { process, notificationListeners } = createFakeProcess();
    const events: unknown[] = [];
    const client = createAcpSessionClient({
      process,
      clientInfo: {
        name: "corestudio",
        title: "CoreStudio",
        version: "1.1.10",
      },
      onEvent: (event) => events.push(event),
    });

    const task = client.runTask(createTaskRequest());

    for (const listener of notificationListeners) {
      listener("session/update", {
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "Warning: Skill descriptions were shortened to fit the 2% skills context budget. Codex can still see every skill, but some descriptions are shorter. Disable unused skills or plugins to leave more room for the rest.\n\n",
          },
        },
      });
      listener("session/update", {
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "我会继续处理画板。",
          },
        },
      });
    }

    await task;

    expect(events).not.toContainEqual(
      expect.objectContaining({
        type: "agent-message",
        text: expect.stringContaining("Skill descriptions were shortened"),
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "agent-message",
        text: "我会继续处理画板。",
      }),
    );
  });

  it("rejects unsupported ACP protocol versions", async () => {
    const { process } = createFakeProcess({
      protocolVersion: 99,
      agentCapabilities: {},
    });
    const events: unknown[] = [];
    const client = createAcpSessionClient({
      process,
      clientInfo: {
        name: "corestudio",
        title: "CoreStudio",
        version: "1.1.10",
      },
      onEvent: (event) => events.push(event),
    });

    await expect(client.runTask(createTaskRequest())).rejects.toThrow(
      "Unsupported ACP protocol version",
    );
    expect(events).toEqual(
      expect.arrayContaining([
        {
          taskId: "task-1",
          type: "error",
          code: "ACP_PROTOCOL_VERSION",
          message: "Unsupported ACP protocol version: 99",
        },
      ]),
    );
  });

  it("sends session/cancel notifications", () => {
    const { process, notify } = createFakeProcess();
    const client = createAcpSessionClient({
      process,
      clientInfo: {
        name: "corestudio",
        title: "CoreStudio",
        version: "1.1.10",
      },
      onEvent: vi.fn(),
    });

    client.cancelTask("task-1");

    expect(notify).toHaveBeenCalledWith("session/cancel", {
      sessionId: undefined,
    });
  });
});
