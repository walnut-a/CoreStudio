import { describe, expect, it, vi } from "vitest";

const loadModule = () =>
  require("./ensure-dev-port.cjs") as {
    ensureDevPortAvailable: (options: {
      port?: number;
      spawnSync?: (
        command: string,
        args: string[],
        options: Record<string, unknown>,
      ) => {
        status: number | null;
        stdout?: string | Buffer;
        stderr?: string | Buffer;
        error?: Error;
      };
    }) => void;
  };

describe("ensureDevPortAvailable", () => {
  it("does nothing when the dev port is available", () => {
    const { ensureDevPortAvailable } = loadModule();
    const spawnSync = vi.fn().mockReturnValue({
      status: 1,
      stdout: "",
    });

    expect(() =>
      ensureDevPortAvailable({
        port: 5174,
        spawnSync,
      }),
    ).not.toThrow();

    expect(spawnSync).toHaveBeenCalledWith(
      "lsof",
      ["-nP", "-iTCP:5174", "-sTCP:LISTEN", "-Fpc"],
      expect.objectContaining({
        encoding: "utf8",
      }),
    );
  });

  it("throws a helpful error when the dev port is already occupied", () => {
    const { ensureDevPortAvailable } = loadModule();

    expect(() =>
      ensureDevPortAvailable({
        port: 5174,
        spawnSync: vi.fn().mockReturnValue({
          status: 0,
          stdout: "p94058\ncnode /mock/vite --config vite.config.mts --host 127.0.0.1 --port 5174\n",
        }),
      }),
    ).toThrow(/5174.*已经被占用.*94058/i);
  });
});
