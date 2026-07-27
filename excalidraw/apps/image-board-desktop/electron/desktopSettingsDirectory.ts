import path from "node:path";

import { app } from "electron";

import { AGENT_SETTINGS_DIRECTORY_NAME } from "../src/shared/agentBridgeTypes";

export const resolveDesktopSettingsDirectory = ({
  appDataPath,
  env = process.env,
}: {
  appDataPath: string;
  env?: NodeJS.ProcessEnv;
}) =>
  env.CORESTUDIO_SETTINGS_DIRECTORY
    ? path.resolve(env.CORESTUDIO_SETTINGS_DIRECTORY)
    : path.join(appDataPath, AGENT_SETTINGS_DIRECTORY_NAME);

export const getDesktopSettingsDirectory = () =>
  resolveDesktopSettingsDirectory({
    appDataPath: app.getPath("appData"),
  });
