import { EventEmitter } from "node:events";
import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);

const loadModule = () =>
  require("./smoke-packaged.cjs") as {
    findPackagedAppExecutable: (options: {
      appRoot: string;
      platform: NodeJS.Platform;
      productName: string;
      existsSync: (filePath: string) => boolean;
      readdirSync: (
        directoryPath: string,
        options: { withFileTypes: true },
      ) => Array<{
        name: string;
        isDirectory: () => boolean;
      }>;
      statSync: (filePath: string) => { mtimeMs: number };
    }) => string;
    runPackagedSmoke: (options: {
      executablePath: string;
      spawn: (
        command: string,
        args: string[],
        options: Record<string, unknown>,
      ) => EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: () => void;
      };
      setTimeout: (callback: () => void, timeoutMs: number) => unknown;
      clearTimeout: (timer: unknown) => void;
      env: NodeJS.ProcessEnv;
      timeoutMs: number;
      stdout?: { write: (text: string) => void };
      stderr?: { write: (text: string) => void };
    }) => Promise<void>;
  };

describe("smoke-packaged", () => {
  it("finds the newest macOS packaged app executable", () => {
    const { findPackagedAppExecutable } = loadModule();
    const existsSync = vi.fn((filePath: string) =>
      filePath.endsWith("CoreStudio.app") ||
      filePath.endsWith("Contents/MacOS/CoreStudio"),
    );

    expect(
      findPackagedAppExecutable({
        appRoot: "/workspace/apps/image-board-desktop",
        platform: "darwin",
        productName: "CoreStudio",
        existsSync,
        readdirSync: () => [
          { name: "mac", isDirectory: () => true },
          { name: "mac-arm64", isDirectory: () => true },
        ],
        statSync: (filePath) => ({
          mtimeMs: filePath.includes("mac-arm64") ? 2 : 1,
        }),
      }),
    ).toBe(
      "/workspace/apps/image-board-desktop/release/mac-arm64/CoreStudio.app/Contents/MacOS/CoreStudio",
    );
  });

  it("resolves when the packaged app prints the smoke-ready signal", async () => {
    const { runPackagedSmoke } = loadModule();
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: vi.fn(),
    });
    const spawn = vi.fn(() => child);

    const smoke = runPackagedSmoke({
      executablePath: "/Applications/CoreStudio.app/Contents/MacOS/CoreStudio",
      spawn,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
      env: { HOME: "/Users/alice" },
      timeoutMs: 1000,
      stdout: { write: vi.fn() },
      stderr: { write: vi.fn() },
    });
    child.stdout.emit("data", Buffer.from("[corestudio:smoke-ready]\n"));

    await expect(smoke).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledWith(
      "/Applications/CoreStudio.app/Contents/MacOS/CoreStudio",
      [],
      expect.objectContaining({
        env: expect.objectContaining({
          CORESTUDIO_SMOKE_TEST: "1",
        }),
      }),
    );
    expect(child.kill).toHaveBeenCalled();
  });
});
