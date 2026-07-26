export const resolveDesktopWindowTitle = (input: {
  appName: string;
  configuredTitle?: string;
}) => input.configuredTitle?.trim() || input.appName;

export const buildDesktopStartupIdentity = (input: {
  appPath: string;
  executable: string;
  userData: string;
  windowTitle: string;
}) => ({
  appPath: input.appPath,
  executable: input.executable,
  userData: input.userData,
  windowTitle: input.windowTitle,
});
