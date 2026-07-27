#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildVitestInvocation,
  createRunMetadata,
  formatActiveLockError,
  releaseRunLock,
  resolveDesktopTestOptions,
  resolveRepositoryIdentity,
  terminateOwnedProcess,
  tryAcquireRunLock,
  updateOwnedRunLock,
} from "./desktopTestRunner.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../../..");
const vitestPath = path.join(repoRoot, "node_modules/vitest/vitest.mjs");
const supervisorPath = path.join(
  scriptDirectory,
  "desktop-test-supervisor.mjs",
);

const main = async () => {
  let options;
  try {
    options = resolveDesktopTestOptions({
      argv: process.argv.slice(2),
      env: process.env,
      repoRoot,
      vitestPath,
    });
  } catch (error) {
    console.error(`[CoreStudio test] ${error.message}`);
    return 64;
  }

  const repository = resolveRepositoryIdentity(repoRoot);
  const metadata = createRunMetadata({
    ...repository,
    mode: options.mode,
    maxWorkers: options.maxWorkers,
  });
  const defaultLockPath = path.join(
    repository.repoIdentity,
    "corestudio-desktop-test.lock",
  );
  const lockPath =
    process.env.NODE_ENV === "test" && process.env.CORESTUDIO_TEST_LOCK_PATH
      ? process.env.CORESTUDIO_TEST_LOCK_PATH
      : defaultLockPath;

  console.log(
    `[CoreStudio test] mode=${options.mode} maxWorkers=${options.maxWorkers} timeoutMs=${options.timeoutMs} runnerPID=${process.pid}`,
  );
  console.log(
    `[CoreStudio test] repository=${repository.repoIdentity} worktree=${repository.worktree}`,
  );

  const lock = options.allowConcurrent
    ? {
        acquired: true,
        staleRecovered: false,
        release: () => true,
        bypassed: true,
      }
    : tryAcquireRunLock({ lockPath, metadata });
  if (!lock.acquired) {
    console.error(formatActiveLockError(lock.existing));
    return 73;
  }
  console.log(
    `[CoreStudio test] lock=${
      lock.bypassed ? "bypassed" : "acquired"
    } staleRecovered=${lock.staleRecovered} path=${lockPath}`,
  );

  let invocation = buildVitestInvocation(options);
  if (
    process.env.NODE_ENV === "test" &&
    process.env.CORESTUDIO_TEST_FIXTURE_COMMAND_JSON
  ) {
    invocation = JSON.parse(process.env.CORESTUDIO_TEST_FIXTURE_COMMAND_JSON);
  }

  const supervisor = fork(supervisorPath, [], {
    cwd: repoRoot,
    env: process.env,
    detached: true,
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  updateOwnedRunLock(lockPath, metadata.runId, {
    supervisorPid: supervisor.pid,
  });

  let result;
  let started = false;
  let cancellationRequested = false;

  const requestCancellation = (signal) => {
    const exitCode = signal === "SIGINT" ? 130 : 143;
    if (!cancellationRequested) {
      cancellationRequested = true;
      console.log(`[CoreStudio test] cancellation=${signal}`);
      supervisor.send({
        type: "cancel",
        reason: `runner-${signal}`,
        exitCode,
      });
    } else {
      supervisor.kill(signal);
    }
  };
  process.on("SIGINT", () => requestCancellation("SIGINT"));
  process.on("SIGTERM", () => requestCancellation("SIGTERM"));

  const completion = new Promise((resolve) => {
    supervisor.on("message", (message) => {
      if (message?.type === "started") {
        started = true;
        updateOwnedRunLock(lockPath, metadata.runId, {
          testPid: message.testPid,
          testPgid: message.testPgid,
        });
      }
      if (message?.type === "finished") {
        result = message.result;
        resolve();
      }
    });
    supervisor.once("error", (error) => {
      console.error(`[CoreStudio test] supervisor failed: ${error.message}`);
      resolve();
    });
    supervisor.once("exit", () => resolve());
  });

  supervisor.send({
    type: "start",
    invocation,
    options: {
      repoRoot,
      timeoutMs: options.timeoutMs,
      killGraceMs: options.killGraceMs,
      env: process.env,
    },
    lock: {
      lockPath: lock.bypassed ? undefined : lockPath,
      runId: metadata.runId,
    },
  });
  await completion;

  if (!result) {
    const currentLock = fs.existsSync(lockPath)
      ? JSON.parse(fs.readFileSync(lockPath, "utf8"))
      : undefined;
    if (started && currentLock?.runId === metadata.runId) {
      const cleanup = await terminateOwnedProcess({
        pid: currentLock.testPid,
        pgid: currentLock.testPgid,
        graceMs: options.killGraceMs,
      });
      console.error(
        `[CoreStudio test] supervisor exited unexpectedly; fallback cleanup remaining=${cleanup.remaining}`,
      );
    }
    if (!lock.bypassed) {
      releaseRunLock(lockPath, metadata.runId);
    }
    return 1;
  }

  if (supervisor.connected) {
    supervisor.disconnect();
  }
  return result.exitCode;
};

process.exitCode = await main();
