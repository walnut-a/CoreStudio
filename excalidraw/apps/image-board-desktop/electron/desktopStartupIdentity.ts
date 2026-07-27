export const resolveDesktopWindowTitle = (input: {
  appName: string;
  configuredTitle?: string;
}) => input.configuredTitle?.trim() || input.appName;

export const buildDesktopStartupIdentity = (input: {
  runtimeMode: string;
  appName: string;
  appPath: string;
  executable: string;
  userData: string;
  windowTitle: string;
  bridgePort: number;
  sessionPath: string;
  settingsDirectory: string;
}) => ({
  runtimeMode: input.runtimeMode,
  appName: input.appName,
  appPath: input.appPath,
  executable: input.executable,
  userData: input.userData,
  windowTitle: input.windowTitle,
  bridgePort: input.bridgePort,
  sessionPath: input.sessionPath,
  settingsDirectory: input.settingsDirectory,
});
