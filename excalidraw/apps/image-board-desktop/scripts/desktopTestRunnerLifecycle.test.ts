import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const runnerPath = path.join(
  repositoryRoot,
  "apps/image-board-desktop/scripts/run-desktop-tests.mjs",
);
const fixturePath = path.join(
  repositoryRoot,
  "apps/image-board-desktop/scripts/fixtures/desktop-test-process-fixture.mjs",
);
const spawnedProcesses: ChildProcess[] = [];
const tempDirectories: string[] = [];

const processExists = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitFor = async (
  predicate: () => boolean,
  message: string,
  timeoutMs = 5_000,
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(message);
};

const makeScenario = (extraEnv: NodeJS.ProcessEnv = {}) => {
  const tempDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "corestudio-test-lifecycle-"),
  );
  tempDirectories.push(tempDirectory);
  const statePath = path.join(tempDirectory, "fixture-state.json");
  const lockPath = path.join(tempDirectory, "desktop-test.lock");
  const fixtureCommand = JSON.stringify({
    command: process.execPath,
    args: [fixturePath],
  });
  const child = spawn(process.execPath, [runnerPath, "--mode=run"], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      CORESTUDIO_TEST_FIXTURE_COMMAND_JSON: fixtureCommand,
      CORESTUDIO_TEST_LOCK_PATH: lockPath,
      CORESTUDIO_FIXTURE_STATE_PATH: statePath,
      CORESTUDIO_TEST_TIMEOUT_MS: "10000",
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  spawnedProcesses.push(child);
  return { child, statePath, lockPath, fixtureCommand, tempDirectory };
};

const readFixturePids = (statePath: string) =>
  JSON.parse(fs.readFileSync(statePath, "utf8")) as {
    parentPid: number;
    childPid: number;
  };

const waitForExit = (child: ChildProcess) =>
  new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve) => {
      child.once("exit", (code, signal) => resolve({ code, signal }));
    },
  );

afterEach(async () => {
  for (const child of spawnedProcesses.splice(0)) {
    if (child.pid && processExists(child.pid)) {
      child.kill("SIGTERM");
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe.sequential("desktop test runner lifecycle", () => {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    it(`cleans the owned fixture tree after ${signal}`, async () => {
      const scenario = makeScenario();
      await waitFor(
        () => fs.existsSync(scenario.statePath),
        "fixture did not start",
      );
      const fixturePids = readFixturePids(scenario.statePath);
      scenario.child.kill(signal);
      await waitForExit(scenario.child);

      await waitFor(
        () =>
          !processExists(fixturePids.parentPid) &&
          !processExists(fixturePids.childPid),
        `fixture tree survived ${signal}`,
      );
      expect(fs.existsSync(scenario.lockPath)).toBe(false);
    });
  }

  it.skipIf(process.platform === "win32")(
    "uses the watchdog after the runner is killed directly",
    async () => {
      const scenario = makeScenario();
      await waitFor(
        () => fs.existsSync(scenario.statePath),
        "fixture did not start",
      );
      const fixturePids = readFixturePids(scenario.statePath);
      scenario.child.kill("SIGKILL");
      await waitForExit(scenario.child);

      await waitFor(
        () =>
          !processExists(fixturePids.parentPid) &&
          !processExists(fixturePids.childPid),
        "watchdog left fixture processes behind",
      );
      await waitFor(
        () => !fs.existsSync(scenario.lockPath),
        "watchdog left the run lock behind",
      );
    },
  );

  it("cleans the owned fixture tree after timeout", async () => {
    const scenario = makeScenario({
      CORESTUDIO_TEST_TIMEOUT_MS: "250",
    });
    await waitFor(
      () => fs.existsSync(scenario.statePath),
      "fixture did not start",
    );
    const fixturePids = readFixturePids(scenario.statePath);
    const result = await waitForExit(scenario.child);

    expect(result.code).not.toBe(0);
    await waitFor(
      () =>
        !processExists(fixturePids.parentPid) &&
        !processExists(fixturePids.childPid),
      "timed out fixture tree survived",
    );
    expect(fs.existsSync(scenario.lockPath)).toBe(false);
  });

  it("cleans remaining children when the managed command fails", async () => {
    const scenario = makeScenario({
      CORESTUDIO_FIXTURE_EXIT_CODE: "7",
    });
    await waitFor(
      () => fs.existsSync(scenario.statePath),
      "fixture did not start",
    );
    const fixturePids = readFixturePids(scenario.statePath);
    const result = await waitForExit(scenario.child);

    expect(result.code).toBe(7);
    await waitFor(
      () => !processExists(fixturePids.childPid),
      "failed fixture left its child behind",
    );
    expect(fs.existsSync(scenario.lockPath)).toBe(false);
  });

  it("cleans remaining children when the managed command succeeds", async () => {
    const scenario = makeScenario({
      CORESTUDIO_FIXTURE_EXIT_CODE: "0",
    });
    await waitFor(
      () => fs.existsSync(scenario.statePath),
      "fixture did not start",
    );
    const fixturePids = readFixturePids(scenario.statePath);
    const result = await waitForExit(scenario.child);

    expect(result.code).toBe(0);
    await waitFor(
      () => !processExists(fixturePids.childPid),
      "successful fixture left its child behind",
    );
    expect(fs.existsSync(scenario.lockPath)).toBe(false);
  });

  it("rejects a duplicate full run and reports the active owner", async () => {
    const first = makeScenario();
    await waitFor(
      () => fs.existsSync(first.statePath),
      "fixture did not start",
    );

    const second = spawn(process.execPath, [runnerPath, "--mode=run"], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        NODE_ENV: "test",
        CORESTUDIO_TEST_FIXTURE_COMMAND_JSON: first.fixtureCommand,
        CORESTUDIO_TEST_LOCK_PATH: first.lockPath,
        CORESTUDIO_FIXTURE_STATE_PATH: path.join(
          first.tempDirectory,
          "second-state.json",
        ),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    spawnedProcesses.push(second);
    let stderr = "";
    second.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const secondResult = await waitForExit(second);

    expect(secondResult.code).toBe(73);
    expect(stderr).toContain(`PID ${first.child.pid}`);
    expect(stderr).toContain("kill -TERM");

    first.child.kill("SIGTERM");
    await waitForExit(first.child);
  });

  it("recovers a stale lock in a real runner invocation", async () => {
    const tempDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "corestudio-test-stale-"),
    );
    tempDirectories.push(tempDirectory);
    const lockPath = path.join(tempDirectory, "desktop-test.lock");
    fs.writeFileSync(
      lockPath,
      `${JSON.stringify({
        schemaVersion: 1,
        repoIdentity: "stale",
        worktree: repositoryRoot,
        runId: "stale-run",
        runnerPid: 999_999,
        mode: "run",
        maxWorkers: 2,
        startedAt: "2026-07-27T00:00:00.000Z",
      })}\n`,
    );
    const result = spawn(
      process.execPath,
      [runnerPath, "--mode=run", "--help"],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          NODE_ENV: "test",
          CORESTUDIO_TEST_LOCK_PATH: lockPath,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    spawnedProcesses.push(result);
    let stdout = "";
    result.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    const exit = await waitForExit(result);

    expect(exit.code).toBe(0);
    expect(stdout).toContain("mode=run");
    expect(stdout).toContain("maxWorkers=2");
    expect(stdout).toMatch(/runnerPID=\d+/);
    expect(stdout).toContain("repository=");
    expect(stdout).toContain("lock=acquired");
    expect(stdout).toContain("staleRecovered=true");
    expect(stdout).toMatch(/mainPID=\d+ mainPGID=\d+/);
    expect(stdout).toContain("cleanup=complete");
    expect(stdout).toContain("remaining=0");
    expect(stdout).toContain("lockReleased=true");
    expect(fs.existsSync(lockPath)).toBe(false);
  });
});
