import path from "node:path";

import { AGENT_SESSION_FILE_NAME } from "../src/shared/agentBridgeTypes";
import {
  getAgentSessionDirectory,
  getAgentSessionPath,
  type AgentSessionPathInput,
} from "./agent/sessionPaths";

export const PRODUCTION_AGENT_BRIDGE_PORT = 60909;
export const DEVELOPMENT_AGENT_BRIDGE_PORT = 60910;
export const QA_AGENT_BRIDGE_PORT = 60911;
export const PREVIEW_AGENT_BRIDGE_PORT = 60913;
export const PRODUCTION_APP_NAME = "CoreStudio";
export const DEVELOPMENT_APP_NAME = "CoreStudio Dev";
export const PREVIEW_APP_NAME = "CoreStudio Preview";

export type DesktopRuntimeMode =
  | "production"
  | "development"
  | "preview"
  | "qa";

export const shouldDefaultAgentAccessEnabled = (
  mode: DesktopRuntimeMode,
) => mode === "development" || mode === "preview";

interface DesktopRuntimeConfigInput extends AgentSessionPathInput {
  bundledAppName: string;
  isPackaged: boolean;
  userDataPath: string;
}

const resolveRuntimeMode = (
  appName: string,
  configuredMode: string | undefined,
): DesktopRuntimeMode => {
  const mode = configuredMode?.trim();
  if (mode) {
    if (
      mode === "production" ||
      mode === "development" ||
      mode === "preview" ||
      mode === "qa"
    ) {
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
    if (mode === "production") {
      return PRODUCTION_AGENT_BRIDGE_PORT;
    }
    return mode === "preview"
      ? PREVIEW_AGENT_BRIDGE_PORT
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

const assertRuntimeBoundary = (input: {
  mode: DesktopRuntimeMode;
  bundledAppName: string;
  isPackaged: boolean;
  appName: string;
  bridgePort: number;
  userDataPath: string;
  settingsDirectory: string;
  sessionPath: string;
  env: NodeJS.ProcessEnv;
}) => {
  if (input.mode === "production" && !input.isPackaged) {
    throw new Error(
      "A source checkout must be launched through the fixed CoreStudio Dev launcher. Run `corepack yarn dev:desktop` instead of starting Electron directly.",
    );
  }

  if (input.mode === "qa") {
    if (input.env.CORESTUDIO_SMOKE_TEST !== "1") {
      throw new Error(
        "The qa runtime is reserved for the automated packaged smoke test. Use CoreStudio Dev for interactive UI acceptance.",
      );
    }
    if (input.bridgePort !== QA_AGENT_BRIDGE_PORT) {
      throw new Error(
        `The packaged smoke test must use its fixed Agent Bridge port ${QA_AGENT_BRIDGE_PORT}.`,
      );
    }
    return;
  }

  if (input.mode === "preview") {
    const fixedSettingsDirectory = path.resolve(input.userDataPath);
    const fixedSessionPath = path.join(
      fixedSettingsDirectory,
      AGENT_SESSION_FILE_NAME,
    );
    if (!input.isPackaged) {
      throw new Error(
        "The preview runtime is reserved for the fixed packaged preview launcher.",
      );
    }
    if (
      path.basename(fixedSettingsDirectory) !== ".electron-preview-profile" ||
      input.appName !== PREVIEW_APP_NAME ||
      input.bridgePort !== PREVIEW_AGENT_BRIDGE_PORT ||
      input.settingsDirectory !== fixedSettingsDirectory ||
      input.sessionPath !== fixedSessionPath
    ) {
      throw new Error(
        `CoreStudio packaged preview must use .electron-preview-profile, app name "${PREVIEW_APP_NAME}", Agent Bridge ${PREVIEW_AGENT_BRIDGE_PORT}, and its fixed session path.`,
      );
    }
    return;
  }

  if (input.mode !== "development") {
    return;
  }

  const fixedSettingsDirectory = path.resolve(input.userDataPath);
  if (
    input.bundledAppName !== DEVELOPMENT_APP_NAME &&
    path.basename(fixedSettingsDirectory) !== ".electron-dev-profile"
  ) {
    throw new Error(
      "CoreStudio source development must use the fixed .electron-dev-profile created by the CoreStudio Dev launcher.",
    );
  }
  const fixedSessionPath = path.join(
    fixedSettingsDirectory,
    AGENT_SESSION_FILE_NAME,
  );
  if (
    input.appName !== DEVELOPMENT_APP_NAME ||
    input.bridgePort !== DEVELOPMENT_AGENT_BRIDGE_PORT ||
    input.settingsDirectory !== fixedSettingsDirectory ||
    input.sessionPath !== fixedSessionPath
  ) {
    throw new Error(
      `CoreStudio Dev must use its fixed development identity: app name "${DEVELOPMENT_APP_NAME}", Agent Bridge ${DEVELOPMENT_AGENT_BRIDGE_PORT}, and the active development user-data directory for settings and session.`,
    );
  }
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
  const bridgePort = resolveBridgePort(env.CORESTUDIO_AGENT_BRIDGE_PORT, mode);

  assertRuntimeBoundary({
    mode,
    bundledAppName: input.bundledAppName,
    isPackaged: input.isPackaged,
    appName,
    bridgePort,
    userDataPath: input.userDataPath,
    settingsDirectory,
    sessionPath,
    env,
  });

  return {
    mode,
    appName,
    bridgePort,
    settingsDirectory,
    sessionPath,
  } as const;
};
