import fs from "fs/promises";
import path from "path";

import { app } from "electron";

import {
  getDefaultAcpAgentSettings,
  normalizeAcpAgentSettings,
  type AcpAgentSettings,
} from "../../src/shared/acpTypes";

const SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";
const ACP_AGENT_SETTINGS_FILE_NAME = "acp-agent-settings.json";

const getAcpAgentSettingsPath = () =>
  path.join(
    app.getPath("appData"),
    SETTINGS_DIRECTORY_NAME,
    ACP_AGENT_SETTINGS_FILE_NAME,
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readSettingsShape = (value: unknown): AcpAgentSettings => {
  if (!isRecord(value)) {
    return getDefaultAcpAgentSettings();
  }

  return {
    enabled: value.enabled === true,
    defaultAgentId:
      typeof value.defaultAgentId === "string" ? value.defaultAgentId : null,
    agents: Array.isArray(value.agents)
      ? value.agents.map((agent) => ({
          id: isRecord(agent) && typeof agent.id === "string" ? agent.id : "",
          name:
            isRecord(agent) && typeof agent.name === "string" ? agent.name : "",
          command:
            isRecord(agent) && typeof agent.command === "string"
              ? agent.command
              : "",
          args:
            isRecord(agent) && Array.isArray(agent.args)
              ? agent.args.map(String)
              : [],
          cwd:
            isRecord(agent) && typeof agent.cwd === "string" ? agent.cwd : null,
        }))
      : [],
  };
};

export const loadAcpAgentSettings = async (): Promise<AcpAgentSettings> => {
  try {
    const contents = await fs.readFile(getAcpAgentSettingsPath(), "utf8");
    return normalizeAcpAgentSettings(readSettingsShape(JSON.parse(contents)));
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return getDefaultAcpAgentSettings();
    }
    throw error;
  }
};

export const saveAcpAgentSettings = async (
  settings: AcpAgentSettings,
): Promise<AcpAgentSettings> => {
  const normalizedSettings = normalizeAcpAgentSettings(settings);
  const settingsPath = getAcpAgentSettingsPath();
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(
    settingsPath,
    JSON.stringify(normalizedSettings, null, 2),
    "utf8",
  );
  return normalizedSettings;
};
