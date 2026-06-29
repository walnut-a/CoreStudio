export const ACP_PROTOCOL_VERSION = 1;

export const ACP_AGENT_CUSTOM_PRESET_ID = "custom" as const;

export const DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE = `You are an external ACP Agent working with CoreStudio.

CoreStudio owns the local project data. You may analyze, plan, search, and generate assets, but any CoreStudio project mutation must be done through CoreStudio CLI / Local Bridge.

Use the attached CoreStudio task package as the source of truth for project identity, selected elements, image ids, local bridge address, board URL, and allowed write-back rules.

Use capabilities.cli.executable and capabilities.cli.environment from the task package for CoreStudio CLI commands. Do not infer a relative CLI path from the agent working directory.

When you need original image files, prefer querying paths through the CoreStudio CLI instead of asking CoreStudio to inline image data.

When you write a generated image back to the board, preserve provenance. Use \`write image\` with \`--origin acp-agent\`, the original task prompt via \`--prompt\`, and reference ids via \`--reference-file-ids\` / \`--reference-element-ids\` when available. The task package also exposes default CLI environment values for these fields.

When you write back to the board, report the CLI command result, including created or updated imageId, elementId, frameId, or prompt id when available.

Do not modify CoreStudio project files directly. Do not treat ACP text output as a CoreStudio project mutation.`;

export const ACP_AGENT_PRESETS = [
  {
    id: "codex-acp",
    name: "Codex ACP",
    command: "npx",
    args: ["-y", "@agentclientprotocol/codex-acp"],
    cwd: null,
    description: "通过 Codex ACP 适配器把任务交给 Codex。",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    command: "gemini",
    args: ["--acp"],
    cwd: null,
    description: "使用 Gemini CLI 的 ACP 模式。",
  },
] as const;

export type AcpAgentKnownPresetId = typeof ACP_AGENT_PRESETS[number]["id"];
export type AcpAgentPresetId =
  | AcpAgentKnownPresetId
  | typeof ACP_AGENT_CUSTOM_PRESET_ID;

export interface AcpAgentPreset {
  id: AcpAgentKnownPresetId;
  name: string;
  command: string;
  args: readonly string[];
  cwd: string | null;
  description: string;
}

export interface AcpAgentConfig {
  id: string;
  presetId?: AcpAgentPresetId | null;
  name: string;
  command: string;
  args: string[];
  cwd: string | null;
}

export interface AcpAgentSettings {
  enabled: boolean;
  defaultAgentId: string | null;
  agents: AcpAgentConfig[];
  taskInstructionTemplate?: string;
}

export type AcpTaskStatus =
  | "idle"
  | "connecting"
  | "initializing"
  | "creating-session"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type AcpTaskEvent =
  | {
      taskId: string;
      type: "status";
      status: AcpTaskStatus;
      message: string;
      logPath?: string;
    }
  | {
      taskId: string;
      type: "agent-message";
      messageId?: string;
      text: string;
    }
  | {
      taskId: string;
      type: "tool";
      title: string;
      status: "pending" | "in_progress" | "completed" | "failed";
    }
  | {
      taskId: string;
      type: "error";
      code: string;
      message: string;
    };

export type AcpRunStatus = "running" | "completed" | "failed" | "cancelled";

export type AcpRunLogKind =
  | "task.created"
  | "task.package"
  | "acp.request"
  | "acp.response"
  | "acp.notification"
  | "agent.message"
  | "agent.thought"
  | "tool.call"
  | "tool.update"
  | "stderr"
  | "status"
  | "error"
  | "task.finished";

export interface AcpRunMetadata {
  taskId: string;
  projectToken: string;
  projectName: string;
  agentName: string;
  userPrompt: string;
}

export interface AcpRunSummary extends AcpRunMetadata {
  mode: "acp-agent";
  status: AcpRunStatus;
  startedAt: string;
  endedAt?: string;
  lastMessage?: string;
  errorMessage?: string;
  logFile: string;
}

export interface AcpRunIndex {
  version: 1;
  runs: AcpRunSummary[];
}

export interface AcpRunLogEntry {
  version: 1;
  taskId: string;
  timestamp: string;
  seq: number;
  kind: AcpRunLogKind;
  payload: unknown;
}

export interface AcpRunLogDetail {
  summary: AcpRunSummary;
  entries: AcpRunLogEntry[];
}

export interface AcpTaskRequest {
  taskId: string;
  agentId: string;
  userPrompt: string;
  project: {
    name: string;
    projectPath: string;
    token: string;
    bridgeBaseUrl: string;
    boardUrl: string | null;
  };
  generation: {
    source: "agent" | "builtin";
  };
  selection: {
    elementCount: number;
    items: Array<{
      index: number;
      elementId: string;
      kind: "image" | "text" | "arrow" | "shape";
      fileId?: string;
      imageId?: string;
      label: string;
    }>;
  };
}

export interface AcpJsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

export interface AcpJsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export interface AcpJsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export const getDefaultAcpAgentSettings = (): AcpAgentSettings => ({
  enabled: false,
  agents: [],
  defaultAgentId: null,
  taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
});

export const normalizeAcpTaskInstructionTemplate = (
  template: unknown,
): string => {
  if (typeof template !== "string") {
    return DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE;
  }

  const trimmedTemplate = template.trim();
  return trimmedTemplate || DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE;
};

export const getAcpAgentPreset = (
  presetId: string | null | undefined,
): AcpAgentPreset | null =>
  ACP_AGENT_PRESETS.find((preset) => preset.id === presetId) ?? null;

export const isAcpAgentPresetId = (value: unknown): value is AcpAgentPresetId =>
  value === ACP_AGENT_CUSTOM_PRESET_ID ||
  Boolean(getAcpAgentPreset(String(value)));

export const inferAcpAgentPresetId = (
  agent: AcpAgentConfig | null | undefined,
): AcpAgentPresetId => {
  if (!agent) {
    return "codex-acp";
  }

  if (isAcpAgentPresetId(agent.presetId)) {
    return agent.presetId;
  }

  const matchedPreset = ACP_AGENT_PRESETS.find(
    (preset) =>
      preset.command === agent.command &&
      preset.args.length === agent.args.length &&
      preset.args.every((arg, index) => arg === agent.args[index]),
  );
  return matchedPreset?.id ?? ACP_AGENT_CUSTOM_PRESET_ID;
};

const normalizeAgent = (agent: AcpAgentConfig): AcpAgentConfig | null => {
  const id = agent.id.trim();
  const name = agent.name.trim();
  const command = agent.command.trim();
  const presetId = isAcpAgentPresetId(agent.presetId) ? agent.presetId : null;
  if (!id || !name || !command) {
    return null;
  }

  return {
    id,
    ...(presetId ? { presetId } : {}),
    name,
    command,
    args: Array.isArray(agent.args) ? agent.args.map(String) : [],
    cwd: agent.cwd?.trim() || null,
  };
};

export const normalizeAcpAgentSettings = (
  settings: AcpAgentSettings,
): AcpAgentSettings => {
  const agents = settings.agents
    .map(normalizeAgent)
    .filter((agent): agent is AcpAgentConfig => Boolean(agent));
  const defaultAgentId = agents.some(
    (agent) => agent.id === settings.defaultAgentId,
  )
    ? settings.defaultAgentId
    : agents[0]?.id ?? null;

  return {
    enabled: Boolean(settings.enabled && defaultAgentId),
    agents,
    defaultAgentId,
    taskInstructionTemplate: normalizeAcpTaskInstructionTemplate(
      settings.taskInstructionTemplate,
    ),
  };
};

export const getSelectedAcpAgent = (
  settings: AcpAgentSettings,
): AcpAgentConfig | null => {
  const normalized = normalizeAcpAgentSettings(settings);
  if (!normalized.enabled || !normalized.defaultAgentId) {
    return null;
  }
  return (
    normalized.agents.find((agent) => agent.id === normalized.defaultAgentId) ??
    null
  );
};

export const createAcpTaskEvent = <T extends AcpTaskEvent>(event: T): T =>
  event;
