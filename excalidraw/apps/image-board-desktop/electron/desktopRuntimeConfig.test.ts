import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveDesktopRuntimeConfig } from "./desktopRuntimeConfig";

describe("desktop runtime config", () => {
  it("preserves the production identity, bridge, and global session defaults", () => {
    expect(
      resolveDesktopRuntimeConfig({
        bundledAppName: "image-board-desktop",
        userDataPath: "/Users/alice/Library/Application Support/CoreStudio",
        platform: "darwin",
        homeDir: "/Users/alice",
        env: {},
      }),
    ).toEqual({
      mode: "production",
      appName: "CoreStudio",
      bridgePort: 60909,
      settingsDirectory:
        "/Users/alice/Library/Application Support/Excalidraw Image Board",
      sessionPath:
        "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-session.json",
    });
  });

  it("uses launcher-injected values for source development", () => {
    const sessionPath =
      "/workspace/apps/image-board-desktop/.electron-dev-profile/agent-session.json";

    expect(
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio",
        userDataPath:
          "/workspace/apps/image-board-desktop/.electron-dev-profile",
        platform: "darwin",
        homeDir: "/Users/alice",
        env: {
          CORESTUDIO_RUNTIME_MODE: "development",
          CORESTUDIO_APP_NAME: "CoreStudio Dev",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60910",
          CORESTUDIO_AGENT_SESSION_FILE: sessionPath,
        },
      }),
    ).toEqual({
      mode: "development",
      appName: "CoreStudio Dev",
      bridgePort: 60910,
      settingsDirectory:
        "/workspace/apps/image-board-desktop/.electron-dev-profile",
      sessionPath,
    });
  });

  it("keeps a directly opened CoreStudio Dev.app away from production", () => {
    const userDataPath =
      "/Users/alice/Library/Application Support/CoreStudio Dev";

    expect(
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio Dev",
        userDataPath,
        platform: "darwin",
        homeDir: "/Users/alice",
        env: {},
      }),
    ).toEqual({
      mode: "development",
      appName: "CoreStudio Dev",
      bridgePort: 60910,
      settingsDirectory: userDataPath,
      sessionPath: path.join(userDataPath, "agent-session.json"),
    });
  });

  it("rejects an invalid injected bridge port instead of silently sharing production", () => {
    expect(() =>
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio",
        userDataPath: "/tmp/corestudio-dev",
        env: {
          CORESTUDIO_RUNTIME_MODE: "development",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60909oops",
        },
      }),
    ).toThrow(/CORESTUDIO_AGENT_BRIDGE_PORT/);
  });
});
