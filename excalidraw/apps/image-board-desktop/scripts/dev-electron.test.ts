import path from "node:path";
import fs from "node:fs";

import { describe, expect, it } from "vitest";

const loadModule = () =>
  require("./dev-electron.cjs") as {
    buildDevElectronLaunch: (options: {
      appRoot: string;
      electronPath: string;
      env?: NodeJS.ProcessEnv;
      buildIdentity?: {
        gitCommit: string;
        gitDirty: boolean;
        appVersion: string;
        buildId: string;
      };
    }) => {
      command: string;
      args: string[];
      cwd: string;
      env: NodeJS.ProcessEnv;
      profilePath: string;
      rendererUrl: string;
      debuggingPort: number;
      windowTitle: string;
      bridgePort: number;
      sessionPath: string;
      appName: string;
      identityPath: string;
      instanceKind: string;
      buildIdentity: {
        gitCommit: string;
        gitDirty: boolean;
        buildId: string;
      };
    };
  };

describe("buildDevElectronLaunch", () => {
  it("binds CoreStudio development to its absolute app, profile, and ports", () => {
    const { buildDevElectronLaunch } = loadModule();
    const appRoot = "/workspace/excalidraw/apps/image-board-desktop";
    const electronPath =
      "/workspace/excalidraw/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron";

    const launch = buildDevElectronLaunch({
      appRoot,
      electronPath,
      env: { PATH: "/usr/bin" },
      buildIdentity: {
        gitCommit: "9ce3740ed",
        gitDirty: true,
        appVersion: "1.1.29",
        buildId: "9ce3740ed-dirty",
      },
    });

    expect(launch).toMatchObject({
      command: electronPath,
      cwd: appRoot,
      profilePath: path.join(appRoot, ".electron-dev-profile"),
      rendererUrl: "http://127.0.0.1:5174",
      debuggingPort: 9331,
      windowTitle: "CoreStudio · SOURCE DEV · 9ce3740ed-dirty",
      bridgePort: 60910,
      sessionPath: path.join(
        appRoot,
        ".electron-dev-profile",
        "agent-session.json",
      ),
      appName: "CoreStudio Dev",
      identityPath: path.join(
        appRoot,
        ".electron-dev-profile",
        "runtime-identity.json",
      ),
      instanceKind: "source-dev",
    });
    expect(launch.args).toEqual([
      `--user-data-dir=${path.join(appRoot, ".electron-dev-profile")}`,
      "--remote-debugging-port=9331",
      appRoot,
    ]);
    expect(launch.env).toEqual(
      expect.objectContaining({
        PATH: "/usr/bin",
        ELECTRON_RENDERER_URL: "http://127.0.0.1:5174",
        CORESTUDIO_WINDOW_TITLE: "CoreStudio · SOURCE DEV · 9ce3740ed-dirty",
        CORESTUDIO_RUNTIME_MODE: "development",
        CORESTUDIO_APP_NAME: "CoreStudio Dev",
        CORESTUDIO_AGENT_BRIDGE_PORT: "60910",
        CORESTUDIO_AGENT_SESSION_FILE: path.join(
          appRoot,
          ".electron-dev-profile",
          "agent-session.json",
        ),
        CORESTUDIO_SETTINGS_DIRECTORY: path.join(
          appRoot,
          ".electron-dev-profile",
        ),
        CORESTUDIO_RUNTIME_IDENTITY_FILE: path.join(
          appRoot,
          ".electron-dev-profile",
          "runtime-identity.json",
        ),
        CORESTUDIO_INSTANCE_KIND: "source-dev",
        CORESTUDIO_DEBUG_PORT: "9331",
        CORESTUDIO_GIT_COMMIT: "9ce3740ed",
        CORESTUDIO_GIT_DIRTY: "1",
        CORESTUDIO_BUILD_ID: "9ce3740ed-dirty",
        CORESTUDIO_LAUNCHER_PID: String(process.pid),
      }),
    );
    expect(path.isAbsolute(launch.command)).toBe(true);
    expect(path.isAbsolute(launch.cwd)).toBe(true);
  });

  it("uses an owned process group so cancellation never targets Electron by name", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "dev-electron.cjs"),
      "utf8",
    );

    expect(source).toContain('detached: process.platform !== "win32"');
    expect(source).toMatch(/terminateOwnedProcessGroup/);
    expect(source).not.toMatch(/killall|pkill/);
  });

  it("rejects relative paths so the launcher cannot depend on the shell cwd", () => {
    const { buildDevElectronLaunch } = loadModule();

    expect(() =>
      buildDevElectronLaunch({
        appRoot: "apps/image-board-desktop",
        electronPath: "electron",
      }),
    ).toThrow(/absolute/i);
  });

  it("is the only Electron launch path exposed by the desktop package", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["dev:desktop"]).toContain("dev:electron");
    expect(packageJson.scripts["dev:electron"]).toContain(
      "node scripts/dev-electron.cjs",
    );
    expect(packageJson.scripts["dev:electron"]).not.toMatch(
      /(?:^|\s)electron(?:\s|$)/,
    );
    expect(packageJson.scripts["package:dev:dir"]).toContain(
      "electron-builder --dir --config electron-builder.dev.cjs",
    );
    expect(packageJson.scripts.preview).toBe(
      "yarn package:dev:dir && yarn open:dev:packaged",
    );
    expect(packageJson.scripts.preview).not.toMatch(/(?:^|\s)electron(?:\s|$)/);
  });
});
