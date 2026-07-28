import { describe, expect, it, vi } from "vitest";

const loadModule = () =>
  require("./runtime-instance.cjs") as {
    selectRuntimeInstance: (
      identities: Array<Record<string, unknown>>,
      options: {
        expectedKind?: string;
        processes: Array<{
          pid: number;
          pgid: number;
          command: string;
        }>;
      },
    ) => Record<string, unknown>;
    terminateOwnedProcessGroup: (
      input: {
        pid: number;
        pgid: number;
      },
      dependencies: {
        kill: (pid: number, signal: NodeJS.Signals | 0) => void;
        listProcesses: () => Array<{
          pid: number;
          pgid: number;
          command: string;
        }>;
      },
    ) => Promise<{ remaining: number }>;
    assertRuntimeLaunchAvailable: (
      input: {
        instanceKind: string;
        executable: string;
        appPath?: string;
        userData: string;
        debugPort: number;
      },
      processes: Array<{
        pid: number;
        pgid: number;
        command: string;
      }>,
    ) => void;
  };

const sourceIdentity = {
  schemaVersion: 1,
  instanceKind: "source-dev",
  runtimeMode: "development",
  appName: "CoreStudio Dev",
  executable: "/workspace/node_modules/electron/Electron",
  appPath: "/workspace/apps/image-board-desktop",
  userData: "/workspace/.electron-dev-profile",
  rendererUrl: "http://127.0.0.1:5174",
  debugPort: 9331,
  bridgePort: 60910,
  sessionPath: "/workspace/.electron-dev-profile/agent-session.json",
  identityPath: "/workspace/.electron-dev-profile/runtime-identity.json",
  mainPid: 1200,
  mainPgid: 1200,
  gitCommit: "9ce3740ed",
  gitDirty: false,
  appVersion: "1.1.29",
  buildId: "9ce3740ed",
};

const sourceProcess = {
  pid: 1200,
  pgid: 1200,
  command:
    "/workspace/node_modules/electron/Electron --user-data-dir=/workspace/.electron-dev-profile --remote-debugging-port=9331 /workspace/apps/image-board-desktop",
};

describe("runtime instance selection", () => {
  it("selects only by complete machine identity, never by display name", () => {
    const { selectRuntimeInstance } = loadModule();
    expect(
      selectRuntimeInstance([sourceIdentity], {
        expectedKind: "source-dev",
        processes: [sourceProcess],
      }),
    ).toEqual(sourceIdentity);
  });

  it("fails fast when the expected instance does not match the live process", () => {
    const { selectRuntimeInstance } = loadModule();
    expect(() =>
      selectRuntimeInstance([{ ...sourceIdentity, debugPort: 9332 }], {
        expectedKind: "source-dev",
        processes: [sourceProcess],
      }),
    ).toThrow(/identity conflict.*PID=1200.*PGID=1200/is);
  });

  it("does not auto-select when source and packaged preview both exist", () => {
    const { selectRuntimeInstance } = loadModule();
    const preview = {
      ...sourceIdentity,
      instanceKind: "packaged-preview",
      runtimeMode: "preview",
      appName: "CoreStudio Preview",
      executable: "/workspace/release-dev/CoreStudio Dev",
      appPath: "/workspace/release-dev/app.asar",
      userData: "/workspace/.electron-preview-profile",
      debugPort: 9332,
      bridgePort: 60913,
      sessionPath: "/workspace/.electron-preview-profile/agent-session.json",
      identityPath:
        "/workspace/.electron-preview-profile/runtime-identity.json",
      mainPid: 1300,
      mainPgid: 1300,
    };
    expect(() =>
      selectRuntimeInstance([sourceIdentity, preview], {
        processes: [
          sourceProcess,
          {
            pid: 1300,
            pgid: 1300,
            command:
              "/workspace/release-dev/CoreStudio Dev --user-data-dir=/workspace/.electron-preview-profile --remote-debugging-port=9332",
          },
        ],
      }),
    ).toThrow(/multiple.*--expect/is);
  });

  it("rejects name-only evidence", () => {
    const { selectRuntimeInstance } = loadModule();
    expect(() =>
      selectRuntimeInstance(
        [
          {
            appName: "CoreStudio Dev",
            mainPid: 1200,
            mainPgid: 1200,
          },
        ],
        {
          expectedKind: "source-dev",
          processes: [
            {
              pid: 1200,
              pgid: 1200,
              command: "CoreStudio Dev",
            },
          ],
        },
      ),
    ).toThrow(/incomplete.*display name/is);
  });
});

describe("runtime instance cleanup", () => {
  it("terminates and rechecks only the recorded process group", async () => {
    const { terminateOwnedProcessGroup } = loadModule();
    const kill = vi.fn();
    let calls = 0;
    const result = await terminateOwnedProcessGroup(
      { pid: 1200, pgid: 1200 },
      {
        kill,
        listProcesses: () => {
          calls += 1;
          return calls === 1
            ? [{ pid: 1200, pgid: 1200, command: "owned" }]
            : [];
        },
      },
    );

    expect(kill).toHaveBeenCalledWith(-1200, "SIGTERM");
    expect(kill).not.toHaveBeenCalledWith(1200, expect.anything());
    expect(result).toEqual({ remaining: 0 });
  });
});

describe("runtime instance preflight", () => {
  it("fails before launch when an exact same-kind process already exists", () => {
    const { assertRuntimeLaunchAvailable } = loadModule();
    expect(() =>
      assertRuntimeLaunchAvailable(
        {
          instanceKind: "source-dev",
          executable: sourceIdentity.executable,
          appPath: sourceIdentity.appPath,
          userData: sourceIdentity.userData,
          debugPort: sourceIdentity.debugPort,
        },
        [sourceProcess],
      ),
    ).toThrow(/launch conflict.*PID=1200.*kill -TERM -- -1200/is);
  });

  it("does not confuse an unrelated Electron command with this checkout", () => {
    const { assertRuntimeLaunchAvailable } = loadModule();
    expect(() =>
      assertRuntimeLaunchAvailable(
        {
          instanceKind: "source-dev",
          executable: sourceIdentity.executable,
          appPath: sourceIdentity.appPath,
          userData: sourceIdentity.userData,
          debugPort: sourceIdentity.debugPort,
        },
        [
          {
            pid: 1400,
            pgid: 1400,
            command: "/workspace/node_modules/electron/Electron /other/project",
          },
        ],
      ),
    ).not.toThrow();
  });
});
