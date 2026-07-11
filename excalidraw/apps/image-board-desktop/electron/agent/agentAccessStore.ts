import fs from "fs/promises";
import path from "path";

import { app } from "electron";

const SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";
const AGENT_ACCESS_SETTINGS_FILE_NAME = "agent-access-settings.json";

export interface AgentAccessSettings {
  enabled: boolean;
}

const defaultAgentAccessSettings = (): AgentAccessSettings => ({
  enabled: false,
});

const getAgentAccessSettingsPath = () =>
  path.join(
    app.getPath("appData"),
    SETTINGS_DIRECTORY_NAME,
    AGENT_ACCESS_SETTINGS_FILE_NAME,
  );

const normalizeAgentAccessSettings = (
  value: unknown,
): AgentAccessSettings => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return defaultAgentAccessSettings();
  }

  return {
    enabled: (value as Partial<AgentAccessSettings>).enabled === true,
  };
};

export const loadAgentAccessSettings =
  async (): Promise<AgentAccessSettings> => {
    try {
      const contents = await fs.readFile(getAgentAccessSettingsPath(), "utf8");
      return normalizeAgentAccessSettings(JSON.parse(contents));
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return defaultAgentAccessSettings();
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
