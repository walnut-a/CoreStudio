import type { AgentHost } from "./agentBridgeTypes";

export const AGENT_INTEGRATION_MANIFEST_SCHEMA_VERSION = 2;
export const AGENT_INTEGRATION_VERSION = "2.2.0";
export const AGENT_INTEGRATION_SKILL_VERSION = 24;
export const AGENT_INTEGRATION_CLI_WRAPPER_VERSION = 2;

export const AGENT_HOST_LABELS: Record<AgentHost, string> = {
  codex: "Codex",
  cursor: "Cursor",
  "claude-code": "Claude Code",
  workbuddy: "WorkBuddy",
  qwenwork: "千问办公",
  doubaowork: "豆包工作",
};

export const AGENT_HOST_SKILL_DIRECTORIES: Record<AgentHost, string[]> = {
  codex: [".codex", "skills", "corestudio"],
  cursor: [".cursor", "skills", "corestudio"],
  "claude-code": [".claude", "skills", "corestudio"],
  workbuddy: [".workbuddy-ai", "skills", "corestudio"],
  qwenwork: [".qwenworkcn", "skills", "corestudio"],
  doubaowork: [
    "Library",
    "Application Support",
    "DoubaoWork",
    "Default",
    ".doubaowork",
    "agent_mode",
    "workspace",
    ".user_skills",
    "corestudio",
  ],
};
