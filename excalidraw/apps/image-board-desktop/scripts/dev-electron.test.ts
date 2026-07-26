import path from "node:path";
import fs from "node:fs";

import { describe, expect, it } from "vitest";

const loadModule = () =>
  require("./dev-electron.cjs") as {
    buildDevElectronLaunch: (options: {
      appRoot: string;
      electronPath: string;
      env?: NodeJS.ProcessEnv;
    }) => {
      command: string;
      args: string[];
      cwd: string;
      env: NodeJS.ProcessEnv;
      profilePath: string;
      rendererUrl: string;
      debuggingPort: number;
      windowTitle: string;
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
    });

    expect(launch).toMatchObject({
      command: electronPath,
      cwd: appRoot,
      profilePath: path.join(appRoot, ".electron-dev-profile"),
      rendererUrl: "http://127.0.0.1:5174",
      debuggingPort: 9331,
      windowTitle: "CoreStudio · DEV",
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
        CORESTUDIO_WINDOW_TITLE: "CoreStudio · DEV",
      }),
    );
    expect(path.isAbsolute(launch.command)).toBe(true);
    expect(path.isAbsolute(launch.cwd)).toBe(true);
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
  });
});
