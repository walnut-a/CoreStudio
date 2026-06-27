export const ACP_PROTOCOL_VERSION = 1;

export interface AcpAgentConfig {
  id: string;
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

const normalizeAgent = (agent: AcpAgentConfig): AcpAgentConfig | null => {
  const id = agent.id.trim();
  const name = agent.name.trim();
  const command = agent.command.trim();
  if (!id || !name || !command) {
    return null;
  }

  return {
    id,
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
