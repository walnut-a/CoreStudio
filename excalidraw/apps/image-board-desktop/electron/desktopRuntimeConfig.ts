import path from "node:path";

import { AGENT_SESSION_FILE_NAME } from "../src/shared/agentBridgeTypes";
import {
  getAgentSessionDirectory,
  getAgentSessionPath,
  type AgentSessionPathInput,
} from "./agent/sessionPaths";

export const PRODUCTION_AGENT_BRIDGE_PORT = 60909;
export const DEVELOPMENT_AGENT_BRIDGE_PORT = 60910;
export const PRODUCTION_APP_NAME = "CoreStudio";
export const DEVELOPMENT_APP_NAME = "CoreStudio Dev";

export type DesktopRuntimeMode = "production" | "development" | "qa";

interface DesktopRuntimeConfigInput extends AgentSessionPathInput {
  bundledAppName: string;
  userDataPath: string;
}

const resolveRuntimeMode = (
  appName: string,
  configuredMode: string | undefined,
): DesktopRuntimeMode => {
  const mode = configuredMode?.trim();
  if (mode) {
    if (mode === "production" || mode === "development" || mode === "qa") {
      return mode;
    }
    throw new Error(`Unsupported CORESTUDIO_RUNTIME_MODE: ${configuredMode}`);
  }
  return appName === DEVELOPMENT_APP_NAME ? "development" : "production";
};

const resolveBridgePort = (
  configuredPort: string | undefined,
  mode: DesktopRuntimeMode,
) => {
  if (!configuredPort) {
    return mode === "production"
      ? PRODUCTION_AGENT_BRIDGE_PORT
      : DEVELOPMENT_AGENT_BRIDGE_PORT;
  }

  if (!/^\d+$/.test(configuredPort)) {
    throw new Error(`Invalid CORESTUDIO_AGENT_BRIDGE_PORT: ${configuredPort}`);
  }
  const port = Number(configuredPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid CORESTUDIO_AGENT_BRIDGE_PORT: ${configuredPort}`);
  }
  return port;
};

export const resolveDesktopAppName = ({
  bundledAppName,
  env = process.env,
}: Pick<DesktopRuntimeConfigInput, "bundledAppName" | "env">) =>
  env.CORESTUDIO_APP_NAME?.trim() ||
  (bundledAppName === DEVELOPMENT_APP_NAME
    ? DEVELOPMENT_APP_NAME
    : PRODUCTION_APP_NAME);

export const resolveDesktopRuntimeConfig = (
  input: DesktopRuntimeConfigInput,
) => {
  const env = input.env ?? process.env;
  const appName = resolveDesktopAppName({
    bundledAppName: input.bundledAppName,
    env,
  });
  const mode = resolveRuntimeMode(appName, env.CORESTUDIO_RUNTIME_MODE);
  const defaultSettingsDirectory =
    mode === "production"
      ? getAgentSessionDirectory(input)
      : input.userDataPath;
  const settingsDirectory = env.CORESTUDIO_SETTINGS_DIRECTORY
    ? path.resolve(env.CORESTUDIO_SETTINGS_DIRECTORY)
    : defaultSettingsDirectory;
  const sessionPath = env.CORESTUDIO_AGENT_SESSION_FILE
    ? getAgentSessionPath(input)
    : mode === "production"
    ? path.join(getAgentSessionDirectory(input), AGENT_SESSION_FILE_NAME)
    : path.join(settingsDirectory, AGENT_SESSION_FILE_NAME);

  return {
    mode,
    appName,
    bridgePort: resolveBridgePort(env.CORESTUDIO_AGENT_BRIDGE_PORT, mode),
    settingsDirectory,
    sessionPath,
  } as const;
};
