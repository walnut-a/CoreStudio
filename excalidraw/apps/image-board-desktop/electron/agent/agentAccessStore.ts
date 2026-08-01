import fs from "fs/promises";
import path from "path";

import { getDesktopSettingsDirectory } from "../desktopSettingsDirectory";

import type { AgentHost } from "../../src/shared/agentBridgeTypes";

const AGENT_ACCESS_SETTINGS_FILE_NAME = "agent-access-settings.json";

export interface AgentAccessSettings {
  enabled: boolean;
  integrations: Record<AgentHost, { allowImageGeneration: boolean }>;
}

const defaultAgentAccessSettings = (
  defaultEnabled = false,
): AgentAccessSettings => ({
  enabled: defaultEnabled,
  integrations: {
    codex: {
      allowImageGeneration: false,
    },
    cursor: {
      allowImageGeneration: false,
    },
    "claude-code": {
      allowImageGeneration: false,
    },
  },
});

const getAgentAccessSettingsPath = () =>
  path.join(getDesktopSettingsDirectory(), AGENT_ACCESS_SETTINGS_FILE_NAME);

const normalizeAgentAccessSettings = (value: unknown): AgentAccessSettings => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return defaultAgentAccessSettings();
  }

  return {
    enabled: (value as Partial<AgentAccessSettings>).enabled === true,
    integrations: {
      codex: {
        allowImageGeneration:
          (
            value as {
              integrations?: { codex?: { allowImageGeneration?: unknown } };
            }
          ).integrations?.codex?.allowImageGeneration === true,
      },
      cursor: {
        allowImageGeneration:
          (
            value as {
              integrations?: {
                cursor?: { allowImageGeneration?: unknown };
              };
            }
          ).integrations?.cursor?.allowImageGeneration === true,
      },
      "claude-code": {
        allowImageGeneration:
          (
            value as {
              integrations?: {
                "claude-code"?: { allowImageGeneration?: unknown };
              };
            }
          ).integrations?.["claude-code"]?.allowImageGeneration === true,
      },
    },
  };
};

export const loadAgentAccessSettings = async (
  options: { defaultEnabled?: boolean } = {},
): Promise<AgentAccessSettings> => {
  try {
    const contents = await fs.readFile(getAgentAccessSettingsPath(), "utf8");
    return normalizeAgentAccessSettings(JSON.parse(contents));
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return defaultAgentAccessSettings(options.defaultEnabled);
    }
    throw error;
  }
};

export const saveAgentAccessSettings = async (
  settings: AgentAccessSettings,
) => {
  const normalizedSettings = normalizeAgentAccessSettings(settings);
  const settingsPath = getAgentAccessSettingsPath();
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(
    settingsPath,
    JSON.stringify(normalizedSettings, null, 2),
    "utf8",
  );
  return normalizedSettings;
};
