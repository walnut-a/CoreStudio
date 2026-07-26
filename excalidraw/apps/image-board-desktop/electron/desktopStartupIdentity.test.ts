import { describe, expect, it } from "vitest";

import {
  buildDesktopStartupIdentity,
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

  it("reports the three Electron paths needed to identify the running project", () => {
    expect(
      buildDesktopStartupIdentity({
        appPath: "/workspace/apps/image-board-desktop",
        executable:
          "/workspace/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
        userData: "/workspace/apps/image-board-desktop/.electron-dev-profile",
        windowTitle: "CoreStudio · DEV",
      }),
    ).toEqual({
      appPath: "/workspace/apps/image-board-desktop",
      executable:
        "/workspace/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
      userData: "/workspace/apps/image-board-desktop/.electron-dev-profile",
      windowTitle: "CoreStudio · DEV",
    });
  });
});
