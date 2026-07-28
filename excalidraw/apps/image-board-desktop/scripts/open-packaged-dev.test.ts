import path from "node:path";

import { describe, expect, it } from "vitest";

const loadModule = () =>
  require("./open-packaged-dev.cjs") as {
    buildPackagedPreviewLaunch: (options: {
      appRoot: string;
      executablePath: string;
      env?: NodeJS.ProcessEnv;
    }) => {
      command: string;
      args: string[];
      cwd: string;
      env: NodeJS.ProcessEnv;
      profilePath: string;
      identityPath: string;
      debuggingPort: number;
      bridgePort: number;
      sessionPath: string;
      appName: string;
      instanceKind: string;
    };
  };

describe("buildPackagedPreviewLaunch", () => {
  it("binds packaged preview to an identity distinct from source development", () => {
    const { buildPackagedPreviewLaunch } = loadModule();
    const appRoot = "/workspace/excalidraw/apps/image-board-desktop";
    const executablePath =
      "/workspace/excalidraw/apps/image-board-desktop/release-dev/mac-arm64/CoreStudio Dev.app/Contents/MacOS/CoreStudio Dev";
    const launch = buildPackagedPreviewLaunch({
      appRoot,
      executablePath,
      env: { PATH: "/usr/bin" },
    });

    expect(launch).toMatchObject({
      command: executablePath,
      cwd: appRoot,
      profilePath: path.join(appRoot, ".electron-preview-profile"),
      identityPath: path.join(
        appRoot,
        ".electron-preview-profile",
        "runtime-identity.json",
      ),
      debuggingPort: 9332,
      bridgePort: 60913,
      sessionPath: path.join(
        appRoot,
        ".electron-preview-profile",
        "agent-session.json",
      ),
      appName: "CoreStudio Preview",
      instanceKind: "packaged-preview",
    });
    expect(launch.args).toEqual([
      `--user-data-dir=${path.join(appRoot, ".electron-preview-profile")}`,
      "--remote-debugging-port=9332",
    ]);
    expect(launch.env).toEqual(
      expect.objectContaining({
        CORESTUDIO_RUNTIME_MODE: "preview",
        CORESTUDIO_INSTANCE_KIND: "packaged-preview",
        CORESTUDIO_DEBUG_PORT: "9332",
        CORESTUDIO_AGENT_BRIDGE_PORT: "60913",
      }),
    );
  });
});
