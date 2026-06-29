import fs from "node:fs";
import path from "node:path";

import {
  ACP_PROTOCOL_VERSION,
  DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  createAcpTaskEvent,
  normalizeAcpTaskInstructionTemplate,
} from "../../src/shared/acpTypes";

import type { AcpAgentProcess } from "./acpAgentProcess";
import type {
  AcpTaskEvent,
  AcpTaskRequest,
  AcpTaskStatus,
} from "../../src/shared/acpTypes";

export interface AcpClientInfo {
  name: string;
  title: string;
  version: string;
}

export interface AcpSessionClient {
  runTask(request: AcpTaskRequest): Promise<{ stopReason: string }>;
  cancelTask(taskId: string): void;
  dispose(): Promise<void>;
}

interface AcpSessionClientOptions {
  process: AcpAgentProcess;
  clientInfo: AcpClientInfo;
  taskInstructionTemplate?: string;
  onEvent: (event: AcpTaskEvent) => void;
}

interface InitializeResult {
  protocolVersion?: unknown;
  agentCapabilities?: {
    promptCapabilities?: {
      embeddedContext?: unknown;
    };
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toInitializeResult = (value: unknown): InitializeResult =>
  isRecord(value) ? (value as InitializeResult) : {};

const getSessionId = (value: unknown) => {
  if (!isRecord(value) || typeof value.sessionId !== "string") {
    throw new Error("ACP session/new response did not include sessionId.");
  }
  return value.sessionId;
};

const getStopReason = (value: unknown) => {
  if (!isRecord(value) || typeof value.stopReason !== "string") {
    return "unknown";
  }
  return value.stopReason;
};

const ACP_PROMPT_REQUEST_TIMEOUT_MS = 30 * 60_000;

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

const getCoreStudioCliPath = () => {
  const candidates = [
    path.resolve(process.cwd(), "bin/corestudio.cjs"),
    path.resolve(process.cwd(), "apps/image-board-desktop/bin/corestudio.cjs"),
    path.resolve(__dirname, "../bin/corestudio.cjs"),
    path.resolve(__dirname, "../../bin/corestudio.cjs"),
  ];

  return (
    candidates.find((candidate) => fs.existsSync(candidate)) ??
    path.resolve(process.cwd(), "bin/corestudio.cjs")
  );
};

const getCoreStudioCliExecutable = () =>
  `node ${shellQuote(getCoreStudioCliPath())}`;

const getAcpSelectionIds = (request: AcpTaskRequest) => ({
  fileIds: Array.from(
    new Set(
      request.selection.items
        .map((item) => item.fileId)
        .filter((fileId): fileId is string => Boolean(fileId)),
    ),
  ),
  elementIds: Array.from(
    new Set(
      request.selection.items
        .map((item) => item.elementId)
        .filter((elementId): elementId is string => Boolean(elementId)),
    ),
  ),
});

const getCoreStudioCliEnvironment = (request: AcpTaskRequest) => ({
  CORESTUDIO_AGENT_BRIDGE_URL: request.project.bridgeBaseUrl,
  CORESTUDIO_AGENT_PROJECT_TOKEN: request.project.token,
  CORESTUDIO_AGENT_TASK_ID: request.taskId,
  CORESTUDIO_AGENT_USER_PROMPT: request.userPrompt,
  ...(() => {
    const { fileIds, elementIds } = getAcpSelectionIds(request);
    return {
      ...(fileIds.length
        ? { CORESTUDIO_AGENT_REFERENCE_FILE_IDS: fileIds.join(",") }
        : {}),
      ...(elementIds.length
        ? { CORESTUDIO_AGENT_REFERENCE_ELEMENT_IDS: elementIds.join(",") }
        : {}),
    };
  })(),
});

const formatCliEnvPrefix = (environment: Record<string, string>) =>
  Object.entries(environment)
    .map(([key, value]) => `${key}=${shellQuote(value)}`)
    .join(" ");

const buildTaskContext = (request: AcpTaskRequest) => {
  const executable = getCoreStudioCliExecutable();
  const environment = getCoreStudioCliEnvironment(request);
  const commandPrefix = `${formatCliEnvPrefix(environment)} ${executable}`;
  return {
    schemaVersion: "corestudio.acpTask.v1",
    task: {
      userPrompt: request.userPrompt,
    },
    context: {
      app: {
        name: "CoreStudio",
      },
      project: request.project,
      generation: request.generation,
      selection: request.selection,
    },
    capabilities: {
      cli: {
        executable,
        environment,
        examples: [
          `${commandPrefix} read context --json`,
          `${commandPrefix} read selection --json`,
          `${commandPrefix} read image-paths --selection --json`,
          `${commandPrefix} write image /absolute/path/to/image.png --origin acp-agent --prompt ${shellQuote(
            request.userPrompt,
          )} --json`,
          `${commandPrefix} write prompt --text "..." --json`,
        ],
      },
    },
    contract: {
      writeBack: {
        required: true,
        authority: "CoreStudio CLI / Local Bridge",
        rule: "All CoreStudio mutations must go through the CLI.",
      },
      constraints: [
        "Do not modify CoreStudio project files directly.",
        "Do not treat ACP text output as a CoreStudio project mutation.",
        "Use CoreStudio CLI / Local Bridge for all image, prompt, and scene writes.",
      ],
    },
  };
};

const buildPrompt = (
  request: AcpTaskRequest,
  supportsEmbeddedContext: boolean,
  taskInstructionTemplate = DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
) => {
  const contextText = JSON.stringify(buildTaskContext(request), null, 2);
  const instructionText = normalizeAcpTaskInstructionTemplate(
    taskInstructionTemplate,
  );
  const taskText = `用户任务：${request.userPrompt}`;
  const promptText = `${instructionText}\n\n${taskText}`;

  if (supportsEmbeddedContext) {
    return [
      {
        type: "text",
        text: promptText,
      },
      {
        type: "resource",
        resource: {
          uri: "corestudio://task/context",
          mimeType: "application/json",
          text: contextText,
        },
      },
    ];
  }

  return [
    {
      type: "text",
      text: `${promptText}\n\nCoreStudio 上下文：\n${contextText}`,
    },
  ];
};

const isRuntimeNoticeText = (text: string) =>
  text
    .trim()
    .startsWith(
      "Warning: Skill descriptions were shortened to fit the 2% skills context budget.",
    );

const mapSessionUpdateToEvents = (
  taskId: string,
  params: unknown,
): AcpTaskEvent[] => {
  if (!isRecord(params) || !isRecord(params.update)) {
    return [];
  }

  const update = params.update;
  if (update.sessionUpdate === "agent_message_chunk") {
    const content = update.content;
    if (isRecord(content) && content.type === "text") {
      const text = typeof content.text === "string" ? content.text : "";
      if (isRuntimeNoticeText(text)) {
        return [];
      }
      return [
        createAcpTaskEvent({
          taskId,
          type: "agent-message",
          ...(typeof update.messageId === "string"
            ? { messageId: update.messageId }
            : {}),
          text,
        }),
      ];
    }
  }

  if (update.sessionUpdate === "tool_call") {
    return [
      createAcpTaskEvent({
        taskId,
        type: "tool",
        title: typeof update.title === "string" ? update.title : "Agent 工具",
        status: update.status === "in_progress" ? "in_progress" : "pending",
      }),
    ];
  }

  if (update.sessionUpdate === "tool_call_update") {
    const status =
      update.status === "completed" ||
      update.status === "failed" ||
      update.status === "in_progress"
        ? update.status
        : "pending";
    return [
      createAcpTaskEvent({
        taskId,
        type: "tool",
        title: "Agent 工具",
        status,
      }),
    ];
  }

  return [];
};

export const createAcpSessionClient = ({
  process,
  clientInfo,
  taskInstructionTemplate,
  onEvent,
}: AcpSessionClientOptions): AcpSessionClient => {
  let currentTaskId: string | null = null;
  let currentSessionId: string | undefined;
  const unsubscribe = process.jsonRpc.onNotification((method, params) => {
    if (method !== "session/update" || !currentTaskId) {
      return;
    }
    for (const event of mapSessionUpdateToEvents(currentTaskId, params)) {
      onEvent(event);
    }
  });

  const emitStatus = (
    taskId: string,
    status: AcpTaskStatus,
    message: string,
  ) => {
    onEvent(
      createAcpTaskEvent({
        taskId,
        type: "status",
        status,
        message,
      }),
    );
  };

  const emitError = (taskId: string, code: string, message: string) => {
    onEvent(
      createAcpTaskEvent({
        taskId,
        type: "error",
        code,
        message,
      }),
    );
  };

  return {
    async runTask(request) {
      currentTaskId = request.taskId;
      emitStatus(request.taskId, "initializing", "正在初始化 ACP Agent");
      try {
        const initializeResult = toInitializeResult(
          await process.jsonRpc.request("initialize", {
            protocolVersion: ACP_PROTOCOL_VERSION,
            clientCapabilities: {},
            clientInfo,
          }),
        );
        if (initializeResult.protocolVersion !== ACP_PROTOCOL_VERSION) {
          const message = `Unsupported ACP protocol version: ${String(
            initializeResult.protocolVersion,
          )}`;
          emitError(request.taskId, "ACP_PROTOCOL_VERSION", message);
          throw new Error(message);
        }

        emitStatus(request.taskId, "creating-session", "正在创建 Agent 会话");
        currentSessionId = getSessionId(
          await process.jsonRpc.request("session/new", {
            cwd: request.project.projectPath,
            mcpServers: [],
          }),
        );

        emitStatus(request.taskId, "running", "Agent 正在处理");
        const supportsEmbeddedContext =
          initializeResult.agentCapabilities?.promptCapabilities
            ?.embeddedContext === true;
        const result = await process.jsonRpc.request(
          "session/prompt",
          {
            sessionId: currentSessionId,
            prompt: buildPrompt(
              request,
              supportsEmbeddedContext,
              taskInstructionTemplate,
            ),
          },
          {
            timeoutMs: ACP_PROMPT_REQUEST_TIMEOUT_MS,
          },
        );
        const stopReason = getStopReason(result);
        emitStatus(request.taskId, "completed", "Agent 已完成");
        return { stopReason };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("Unsupported ACP")
        ) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        emitError(request.taskId, "ACP_TASK_FAILED", message);
        emitStatus(request.taskId, "failed", "Agent 任务失败");
        throw error;
      }
    },

    cancelTask() {
      process.jsonRpc.notify("session/cancel", {
        sessionId: currentSessionId,
      });
      if (currentTaskId) {
        emitStatus(currentTaskId, "cancelled", "已取消");
      }
    },

    async dispose() {
      unsubscribe();
      await process.dispose();
    },
  };
};
