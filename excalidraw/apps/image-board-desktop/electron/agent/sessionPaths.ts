import os from "node:os";
import path from "node:path";

import {
  AGENT_SESSION_FILE_NAME,
  AGENT_SETTINGS_DIRECTORY_NAME,
} from "../../src/shared/agentBridgeTypes";

export interface AgentSessionPathInput {
  platform?: NodeJS.Platform;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
}

export const getAgentSessionDirectory = ({
  platform = process.platform,
  homeDir = os.homedir(),
  env = process.env,
}: AgentSessionPathInput = {}): string => {
  if (platform === "darwin") {
    return path.join(
      homeDir,
      "Library",
      "Application Support",
      AGENT_SETTINGS_DIRECTORY_NAME,
    );
  }

  if (platform === "win32") {
    return path.win32.join(
      env.APPDATA ?? path.win32.join(homeDir, "AppData", "Roaming"),
      AGENT_SETTINGS_DIRECTORY_NAME,
    );
  }

  return path.join(
    env.XDG_CONFIG_HOME ?? path.join(homeDir, ".config"),
    AGENT_SETTINGS_DIRECTORY_NAME,
  );
};

export const getAgentSessionPath = (
  input: AgentSessionPathInput = {},
): string => {
  const platform = input.platform ?? process.platform;
  const env = input.env ?? process.env;
  if (env.CORESTUDIO_AGENT_SESSION_FILE) {
    return path.resolve(env.CORESTUDIO_AGENT_SESSION_FILE);
  }

  if (platform === "win32") {
    return path.win32.join(
      getAgentSessionDirectory(input),
      AGENT_SESSION_FILE_NAME,
    );
  }

  return path.join(getAgentSessionDirectory(input), AGENT_SESSION_FILE_NAME);
};
