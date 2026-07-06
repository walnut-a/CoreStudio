import type { AcpRunLogKind } from "../shared/acpTypes";

export type AgentThreadStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentMessageRole = "user" | "assistant" | "system";
export type AgentToolStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface AgentThread {
  id: string;
  title: string;
  status: AgentThreadStatus;
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
}

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  createdAt: string;
  taskId?: string;
  parts: AgentMessagePart[];
}

export type AgentMessagePart =
  | AgentTextPart
  | AgentToolPart
  | AgentImageResultPart
  | AgentStatusPart
  | AgentErrorPart;

export interface AgentRawEntryRef {
  taskId: string;
  seq: number;
  kind: AcpRunLogKind;
  payload: unknown;
}

export interface AgentTextPart {
  id: string;
  type: "text";
  text: string;
  rawEntries: AgentRawEntryRef[];
}

export interface AgentToolPart {
  id: string;
  type: "tool";
  tool: AgentToolCall;
  rawEntries: AgentRawEntryRef[];
}

export interface AgentImageResultPart {
  id: string;
  type: "image-result";
  image: AgentImageResult;
}

export interface AgentStatusPart {
  id: string;
  type: "status";
  text: string;
  rawEntries: AgentRawEntryRef[];
}

export interface AgentErrorPart {
  id: string;
  type: "error";
  message: string;
  rawEntries: AgentRawEntryRef[];
}

export interface AgentToolCall {
  id: string;
  name: string;
  title: string;
  status: AgentToolStatus;
  summary?: string;
  args?: unknown;
  result?: unknown;
  errorMessage?: string;
}

export interface AgentImageResult {
  id: string;
  fileId: string;
  title: string;
  thumbnailDataUrl?: string | null;
  prompt?: string;
  source: "acp-agent" | "corestudio" | "unknown";
  meta?: string;
  model?: string;
  sizeLabel?: string;
  statusLabel?: string;
  referenceCount?: number;
  createdAt?: string;
}

export interface CreateAgentThreadOptions {
  imageResults?: AgentImageResult[];
  includeRawEntries?: boolean;
}

export interface CreateAgentThreadFromEntriesOptions
  extends CreateAgentThreadOptions {
  id: string;
  title: string;
  status: AgentThreadStatus;
  createdAt: string;
  updatedAt: string;
  fallbackUserPrompt?: string;
}
