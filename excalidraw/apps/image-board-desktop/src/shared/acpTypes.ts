export const ACP_PROTOCOL_VERSION = 1;

export const ACP_AGENT_CUSTOM_PRESET_ID = "custom" as const;

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

export type AcpAgentKnownPresetId = (typeof ACP_AGENT_PRESETS)[number]["id"];
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
});

export const getAcpAgentPreset = (
  presetId: string | null | undefined,
): AcpAgentPreset | null =>
  ACP_AGENT_PRESETS.find((preset) => preset.id === presetId) ?? null;

export const isAcpAgentPresetId = (
  value: unknown,
): value is AcpAgentPresetId =>
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
  const presetId = isAcpAgentPresetId(agent.presetId)
    ? agent.presetId
    : null;
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
