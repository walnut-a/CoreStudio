import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveDesktopRuntimeConfig } from "./desktopRuntimeConfig";

describe("desktop runtime config", () => {
  it("preserves the production identity, bridge, and global session defaults", () => {
    expect(
      resolveDesktopRuntimeConfig({
        bundledAppName: "image-board-desktop",
        isPackaged: true,
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

  it("rejects a source checkout launched without the CoreStudio Dev launcher", () => {
    expect(() =>
      resolveDesktopRuntimeConfig({
        bundledAppName: "image-board-desktop",
        isPackaged: false,
        userDataPath:
          "/Users/alice/Library/Application Support/image-board-desktop",
        platform: "darwin",
        homeDir: "/Users/alice",
        env: {},
      }),
    ).toThrow(/source checkout.*CoreStudio Dev launcher/i);
  });

  it("uses launcher-injected values for source development", () => {
    const sessionPath =
      "/workspace/apps/image-board-desktop/.electron-dev-profile/agent-session.json";

    expect(
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio",
        isPackaged: false,
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

  it("rejects a temporary source profile even when the other development values look valid", () => {
    const userDataPath = "/tmp/corestudio-extra-profile";

    expect(() =>
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio",
        isPackaged: false,
        userDataPath,
        env: {
          CORESTUDIO_RUNTIME_MODE: "development",
          CORESTUDIO_APP_NAME: "CoreStudio Dev",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60910",
          CORESTUDIO_AGENT_SESSION_FILE: path.join(
            userDataPath,
            "agent-session.json",
          ),
          CORESTUDIO_SETTINGS_DIRECTORY: userDataPath,
        },
      }),
    ).toThrow(/source development.*electron-dev-profile/i);
  });

  it("keeps a directly opened CoreStudio Dev.app away from production", () => {
    const userDataPath =
      "/Users/alice/Library/Application Support/CoreStudio Dev";

    expect(
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio Dev",
        isPackaged: true,
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

  it("uses a separate fixed identity for packaged preview", () => {
    const userDataPath =
      "/workspace/apps/image-board-desktop/.electron-preview-profile";
    expect(
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio Dev",
        isPackaged: true,
        userDataPath,
        env: {
          CORESTUDIO_RUNTIME_MODE: "preview",
          CORESTUDIO_APP_NAME: "CoreStudio Preview",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60913",
          CORESTUDIO_AGENT_SESSION_FILE: path.join(
            userDataPath,
            "agent-session.json",
          ),
          CORESTUDIO_SETTINGS_DIRECTORY: userDataPath,
        },
      }),
    ).toEqual({
      mode: "preview",
      appName: "CoreStudio Preview",
      bridgePort: 60913,
      settingsDirectory: userDataPath,
      sessionPath: path.join(userDataPath, "agent-session.json"),
    });
  });

  it("rejects a packaged preview that borrows the source development profile", () => {
    const userDataPath =
      "/workspace/apps/image-board-desktop/.electron-dev-profile";
    expect(() =>
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio Dev",
        isPackaged: true,
        userDataPath,
        env: {
          CORESTUDIO_RUNTIME_MODE: "preview",
          CORESTUDIO_APP_NAME: "CoreStudio Preview",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60913",
          CORESTUDIO_AGENT_SESSION_FILE: path.join(
            userDataPath,
            "agent-session.json",
          ),
          CORESTUDIO_SETTINGS_DIRECTORY: userDataPath,
        },
      }),
    ).toThrow(/electron-preview-profile/i);
  });

  it("rejects an invalid injected bridge port instead of silently sharing production", () => {
    expect(() =>
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio",
        isPackaged: false,
        userDataPath: "/tmp/corestudio-dev",
        env: {
          CORESTUDIO_RUNTIME_MODE: "development",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60909oops",
        },
      }),
    ).toThrow(/CORESTUDIO_AGENT_BRIDGE_PORT/);
  });

  it("reserves the qa runtime for the automated packaged smoke test", () => {
    expect(() =>
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio",
        isPackaged: true,
        userDataPath: "/tmp/corestudio-chevron-qa",
        env: {
          CORESTUDIO_RUNTIME_MODE: "qa",
          CORESTUDIO_APP_NAME: "CoreStudio Chevron QA",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60912",
          CORESTUDIO_AGENT_SESSION_FILE:
            "/tmp/corestudio-chevron-qa/agent-session.json",
          CORESTUDIO_SETTINGS_DIRECTORY: "/tmp/corestudio-chevron-qa",
        },
      }),
    ).toThrow(/qa runtime.*packaged smoke/i);
  });

  it("allows the automated packaged smoke test to use its temporary qa identity", () => {
    expect(
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio",
        isPackaged: true,
        userDataPath: "/tmp/corestudio-app-smoke",
        env: {
          CORESTUDIO_SMOKE_TEST: "1",
          CORESTUDIO_RUNTIME_MODE: "qa",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60911",
          CORESTUDIO_AGENT_SESSION_FILE:
            "/tmp/corestudio-app-smoke/agent-session.json",
          CORESTUDIO_SETTINGS_DIRECTORY: "/tmp/corestudio-app-smoke",
        },
      }),
    ).toEqual({
      mode: "qa",
      appName: "CoreStudio",
      bridgePort: 60911,
      settingsDirectory: "/tmp/corestudio-app-smoke",
      sessionPath: "/tmp/corestudio-app-smoke/agent-session.json",
    });
  });

  it.each([
    {
      name: "Bridge 端口",
      env: {
        CORESTUDIO_AGENT_BRIDGE_PORT: "60912",
      },
    },
    {
      name: "设置目录",
      env: {
        CORESTUDIO_SETTINGS_DIRECTORY: "/tmp/corestudio-extra-profile",
      },
    },
    {
      name: "session 文件",
      env: {
        CORESTUDIO_AGENT_SESSION_FILE:
          "/tmp/corestudio-extra-profile/agent-session.json",
      },
    },
  ])("拒绝用自定义$name绕过固定开发身份", ({ env }) => {
    const userDataPath =
      "/workspace/apps/image-board-desktop/.electron-dev-profile";

    expect(() =>
      resolveDesktopRuntimeConfig({
        bundledAppName: "CoreStudio",
        isPackaged: false,
        userDataPath,
        env: {
          CORESTUDIO_RUNTIME_MODE: "development",
          CORESTUDIO_APP_NAME: "CoreStudio Dev",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60910",
          CORESTUDIO_AGENT_SESSION_FILE: path.join(
            userDataPath,
            "agent-session.json",
          ),
          CORESTUDIO_SETTINGS_DIRECTORY: userDataPath,
          ...env,
        },
      }),
    ).toThrow(/CoreStudio Dev.*fixed/i);
  });
});
