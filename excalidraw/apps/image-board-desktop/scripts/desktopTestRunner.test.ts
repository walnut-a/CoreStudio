import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildVitestInvocation,
  formatActiveLockError,
  resolveDesktopTestOptions,
  tryAcquireRunLock,
} from "./desktopTestRunner.mjs";

const tempDirectories: string[] = [];

const makeTempDirectory = () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "corestudio-test-runner-"),
  );
  tempDirectories.push(directory);
  return directory;
};

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("desktop test command construction", () => {
  it("defaults full tests to one-shot mode with the measured worker limit", () => {
    const options = resolveDesktopTestOptions({
      argv: ["--mode=run"],
      env: {},
      repoRoot: "/workspace/excalidraw",
      vitestPath: "/workspace/excalidraw/node_modules/vitest/vitest.mjs",
    });

    expect(options.mode).toBe("run");
    expect(options.maxWorkers).toBe(2);
    expect(options.allowConcurrent).toBe(false);
    expect(buildVitestInvocation(options)).toEqual({
      command: process.execPath,
      args: [
        "/workspace/excalidraw/node_modules/vitest/vitest.mjs",
        "run",
        "apps/image-board-desktop",
        "--maxWorkers=2",
      ],
    });
  });

  it("keeps watch explicit and accepts bounded environment overrides", () => {
    const options = resolveDesktopTestOptions({
      argv: ["--mode=watch", "--reporter=dot"],
      env: {
        CORESTUDIO_TEST_MAX_WORKERS: "4",
        CORESTUDIO_TEST_TIMEOUT_MS: "9000",
        CORESTUDIO_TEST_ALLOW_CONCURRENT: "1",
      },
      repoRoot: "/workspace/excalidraw",
      vitestPath: "/workspace/excalidraw/node_modules/vitest/vitest.mjs",
    });

    expect(options).toMatchObject({
      mode: "watch",
      maxWorkers: 4,
      timeoutMs: 9000,
      allowConcurrent: true,
      forwardedArgs: ["--reporter=dot"],
    });
    expect(buildVitestInvocation(options).args).toContain("watch");
  });

  it("rejects watch flags passed through the one-shot entry", () => {
    expect(() =>
      resolveDesktopTestOptions({
        argv: ["--mode=run", "--watch"],
        env: {},
        repoRoot: "/workspace/excalidraw",
        vitestPath: "/workspace/excalidraw/node_modules/vitest/vitest.mjs",
      }),
    ).toThrow("test:desktop:watch");
  });
});

describe("desktop test run lock", () => {
  const metadata = {
    schemaVersion: 1,
    repoIdentity: "/workspace/.git",
    worktree: "/workspace/excalidraw",
    runId: "run-current",
    runnerPid: 1234,
    mode: "run",
    maxWorkers: 2,
    startedAt: "2026-07-27T10:00:00.000Z",
  };

  it("atomically rejects a second active full run", () => {
    const lockPath = path.join(makeTempDirectory(), "desktop-test.lock");
    const first = tryAcquireRunLock({
      lockPath,
      metadata,
      isProcessAlive: () => true,
    });
    const second = tryAcquireRunLock({
      lockPath,
      metadata: { ...metadata, runId: "run-second", runnerPid: 5678 },
      isProcessAlive: () => true,
    });

    expect(first).toMatchObject({ acquired: true, staleRecovered: false });
    expect(second).toMatchObject({
      acquired: false,
      staleRecovered: false,
      existing: metadata,
    });
    first.release();
  });

  it("recovers a stale lock whose owner no longer exists", () => {
    const lockPath = path.join(makeTempDirectory(), "desktop-test.lock");
    fs.writeFileSync(
      lockPath,
      `${JSON.stringify({ ...metadata, runnerPid: 999_999 })}\n`,
    );

    const acquired = tryAcquireRunLock({
      lockPath,
      metadata,
      isProcessAlive: () => false,
    });

    expect(acquired).toMatchObject({
      acquired: true,
      staleRecovered: true,
    });
    expect(JSON.parse(fs.readFileSync(lockPath, "utf8"))).toMatchObject({
      repoIdentity: metadata.repoIdentity,
      runnerPid: metadata.runnerPid,
      runId: metadata.runId,
    });
    acquired.release();
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("does not remove a lock that has changed ownership", () => {
    const lockPath = path.join(makeTempDirectory(), "desktop-test.lock");
    const acquired = tryAcquireRunLock({
      lockPath,
      metadata,
      isProcessAlive: () => true,
    });
    fs.writeFileSync(
      lockPath,
      `${JSON.stringify({ ...metadata, runId: "replacement" })}\n`,
    );

    acquired.release();

    expect(fs.existsSync(lockPath)).toBe(true);
  });

  it("reports the active PID, start time, repository and exit command", () => {
    const message = formatActiveLockError(metadata, "darwin");

    expect(message).toContain("PID 1234");
    expect(message).toContain("2026-07-27T10:00:00.000Z");
    expect(message).toContain("/workspace/.git");
    expect(message).toContain("kill -TERM 1234");
  });
});
