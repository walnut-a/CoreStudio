import { describe, expect, it, vi } from "vitest";

const loadModule = () =>
  require("./ensure-electron.cjs") as {
    ensureElectronBinary: (options: {
      electronPath: string;
      electronPackageDir: string;
      execPath: string;
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      existsSync: (path: string) => boolean;
      spawnSync: (
        command: string,
        args: string[],
        options: Record<string, unknown>,
      ) => { status: number | null; error?: Error };
      log?: (message: string) => void;
    }) => { changed: boolean; electronPath: string };
  };

describe("ensureElectronBinary", () => {
  it("does nothing when the Electron binary already exists", () => {
    const { ensureElectronBinary } = loadModule();
    const spawnSync = vi.fn();

    const result = ensureElectronBinary({
      electronPath: "/mock/Electron",
      electronPackageDir: "/mock/electron",
      execPath: "/usr/bin/node",
      existsSync: () => true,
      spawnSync,
    });

    expect(result).toEqual({
      changed: false,
      electronPath: "/mock/Electron",
    });
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it("reruns Electron install when the binary is missing", () => {
    const { ensureElectronBinary } = loadModule();
    const existsSync = vi
      .fn<(path: string) => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const spawnSync = vi.fn().mockReturnValue({ status: 0 });

    const result = ensureElectronBinary({
      electronPath: "/mock/Electron",
      electronPackageDir: "/mock/electron",
      execPath: "/usr/bin/node",
      cwd: "/workspace",
      env: { HOME: "/Users/test" },
      existsSync,
      spawnSync,
    });

    expect(spawnSync).toHaveBeenCalledWith(
      "/usr/bin/node",
      ["/mock/electron/install.js"],
      expect.objectContaining({
        cwd: "/workspace",
        env: { HOME: "/Users/test" },
        stdio: "inherit",
      }),
    );
    expect(result).toEqual({
      changed: true,
      electronPath: "/mock/Electron",
    });
  });

  it("throws a helpful error if Electron reinstall fails", () => {
    const { ensureElectronBinary } = loadModule();

    expect(() =>
      ensureElectronBinary({
        electronPath: "/mock/Electron",
        electronPackageDir: "/mock/electron",
        execPath: "/usr/bin/node",
        existsSync: () => false,
        spawnSync: () => ({
          status: 1,
          error: new Error("download failed"),
        }),
      }),
    ).toThrow(/Electron binary reinstall failed/i);
  });
});
