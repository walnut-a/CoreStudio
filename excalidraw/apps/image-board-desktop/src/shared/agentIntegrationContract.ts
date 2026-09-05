import type { AgentHost } from "./agentBridgeTypes";

export const AGENT_INTEGRATION_MANIFEST_SCHEMA_VERSION = 2;
export const AGENT_INTEGRATION_VERSION = "2.1.2";
export const AGENT_INTEGRATION_SKILL_VERSION = 21;
export const AGENT_INTEGRATION_CLI_WRAPPER_VERSION = 2;

export const AGENT_HOST_LABELS: Record<AgentHost, string> = {
  codex: "Codex",
  cursor: "Cursor",
  "claude-code": "Claude Code",
};

export const AGENT_HOST_SKILL_DIRECTORIES: Record<AgentHost, string[]> = {
  codex: [".codex", "skills", "corestudio"],
  cursor: [".cursor", "skills", "corestudio"],
  "claude-code": [".claude", "skills", "corestudio"],
};
