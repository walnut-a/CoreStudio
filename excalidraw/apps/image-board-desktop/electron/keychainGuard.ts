type ChromiumCommandLine = {
  appendSwitch: (name: string, value?: string) => void;
};

export const configureNoSystemKeychainAccess = (
  commandLine: ChromiumCommandLine,
  platform: NodeJS.Platform = process.platform,
) => {
  if (platform !== "darwin") {
    return;
  }

  // CoreStudio stores provider keys in its own local settings file.
  // Do not let Chromium/Electron touch macOS Keychain for profile storage.
  commandLine.appendSwitch("use-mock-keychain");
  commandLine.appendSwitch("password-store", "basic");
};
