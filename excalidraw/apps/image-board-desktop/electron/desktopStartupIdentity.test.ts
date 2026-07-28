import { describe, expect, it } from "vitest";

import {
  buildDesktopStartupIdentity,
  resolveDesktopInstanceKind,
  resolveDesktopRendererIdentityUrl,
  resolveDesktopWindowTitle,
} from "./desktopStartupIdentity";

describe("desktop startup identity", () => {
  it("uses an explicit development title when the launcher provides one", () => {
    expect(
      resolveDesktopWindowTitle({
        appName: "CoreStudio",
        configuredTitle: "CoreStudio · DEV",
      }),
    ).toBe("CoreStudio · DEV");
  });

  it("falls back to the product name for packaged builds", () => {
    expect(
      resolveDesktopWindowTitle({
        appName: "CoreStudio",
      }),
    ).toBe("CoreStudio");
  });

  it("records the actual packaged shell file URL instead of null", () => {
    expect(
      resolveDesktopRendererIdentityUrl({
        developmentUrl: null,
        packagedIndexPath: "/workspace/app/dist/index.html",
      }),
    ).toBe("file:///workspace/app/dist/index.html?desktopMode=shell");
  });

  it("derives source and preview kinds from trusted runtime state", () => {
    expect(
      resolveDesktopInstanceKind({
        runtimeMode: "development",
        isPackaged: false,
      }),
    ).toBe("source-dev");
    expect(
      resolveDesktopInstanceKind({
        runtimeMode: "preview",
        isPackaged: true,
      }),
    ).toBe("packaged-preview");
  });

  it("reports the three Electron paths needed to identify the running project", () => {
    expect(
      buildDesktopStartupIdentity({
        schemaVersion: 1,
        instanceKind: "source-dev",
        runtimeLabel: "SOURCE DEV",
        runtimeMode: "development",
        appName: "CoreStudio Dev",
        appPath: "/workspace/apps/image-board-desktop",
        executable:
          "/workspace/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
        userData: "/workspace/apps/image-board-desktop/.electron-dev-profile",
        windowTitle: "CoreStudio · DEV",
        bridgePort: 60910,
        sessionPath:
          "/workspace/apps/image-board-desktop/.electron-dev-profile/agent-session.json",
        settingsDirectory:
          "/workspace/apps/image-board-desktop/.electron-dev-profile",
        rendererUrl: "http://127.0.0.1:5174",
        debugPort: 9331,
        identityPath:
          "/workspace/apps/image-board-desktop/.electron-dev-profile/runtime-identity.json",
        mainPid: 1200,
        mainPgid: 1200,
        gitCommit: "9ce3740ed",
        gitDirty: true,
        appVersion: "1.1.30",
        buildId: "9ce3740ed-dirty",
      }),
    ).toEqual({
      schemaVersion: 1,
      instanceKind: "source-dev",
      runtimeLabel: "SOURCE DEV",
      runtimeMode: "development",
      appName: "CoreStudio Dev",
      appPath: "/workspace/apps/image-board-desktop",
      executable:
        "/workspace/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
      userData: "/workspace/apps/image-board-desktop/.electron-dev-profile",
      windowTitle: "CoreStudio · DEV",
      bridgePort: 60910,
      sessionPath:
        "/workspace/apps/image-board-desktop/.electron-dev-profile/agent-session.json",
      settingsDirectory:
        "/workspace/apps/image-board-desktop/.electron-dev-profile",
      rendererUrl: "http://127.0.0.1:5174",
      debugPort: 9331,
      identityPath:
        "/workspace/apps/image-board-desktop/.electron-dev-profile/runtime-identity.json",
      mainPid: 1200,
      mainPgid: 1200,
      gitCommit: "9ce3740ed",
      gitDirty: true,
      appVersion: "1.1.30",
      buildId: "9ce3740ed-dirty",
    });
  });

  it("distinguishes source development from packaged preview without using the display name", () => {
    const source = buildDesktopStartupIdentity({
      schemaVersion: 1,
      instanceKind: "source-dev",
      runtimeLabel: "SOURCE DEV",
      runtimeMode: "development",
      appName: "CoreStudio Dev",
      appPath: "/workspace/apps/image-board-desktop",
      executable: "/workspace/node_modules/electron/Electron",
      userData: "/workspace/.electron-dev-profile",
      windowTitle: "CoreStudio · SOURCE DEV · 9ce3740ed",
      bridgePort: 60910,
      sessionPath: "/workspace/.electron-dev-profile/agent-session.json",
      settingsDirectory: "/workspace/.electron-dev-profile",
      rendererUrl: "http://127.0.0.1:5174",
      debugPort: 9331,
      identityPath: "/workspace/.electron-dev-profile/runtime-identity.json",
      mainPid: 1200,
      mainPgid: 1200,
      gitCommit: "9ce3740ed",
      gitDirty: false,
      appVersion: "1.1.30",
      buildId: "9ce3740ed",
    });
    const preview = buildDesktopStartupIdentity({
      ...source,
      instanceKind: "packaged-preview",
      runtimeLabel: "PACKAGED PREVIEW",
      runtimeMode: "preview",
      appName: "CoreStudio Preview",
      executable: "/workspace/release-dev/CoreStudio Dev",
      appPath: "/workspace/release-dev/app.asar",
      userData: "/workspace/.electron-preview-profile",
      bridgePort: 60913,
      sessionPath: "/workspace/.electron-preview-profile/agent-session.json",
      debugPort: 9332,
      identityPath:
        "/workspace/.electron-preview-profile/runtime-identity.json",
      mainPid: 1300,
      mainPgid: 1300,
    });

    expect(source.instanceKind).toBe("source-dev");
    expect(preview.instanceKind).toBe("packaged-preview");
    expect(preview.runtimeMode).not.toBe(source.runtimeMode);
    expect(preview.debugPort).not.toBe(source.debugPort);
    expect(preview.bridgePort).not.toBe(source.bridgePort);
    expect(preview.userData).not.toBe(source.userData);
  });
});
