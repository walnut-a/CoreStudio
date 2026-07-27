import { spawn } from "node:child_process";

import {
  releaseRunLock,
  sampleOwnedProcessGroup,
  terminateOwnedProcess,
} from "./desktopTestRunner.mjs";

let managedProcess;
let managedPgid;
let lockPath;
let runId;
let killGraceMs;
let timeout;
let sampler;
let finishPromise;
let peakRssKiB = 0;
let peakProcesses = 0;
let startedAt = Date.now();

const send = (message) => {
  if (process.connected) {
    try {
      process.send(message);
    } catch {}
  }
};

const sample = () => {
  if (!managedPgid) {
    return;
  }
  const current = sampleOwnedProcessGroup(managedPgid);
  peakRssKiB = Math.max(peakRssKiB, current.rssKiB);
  peakProcesses = Math.max(peakProcesses, current.processCount);
};

const finish = (reason, exitCode) => {
  if (finishPromise) {
    return finishPromise;
  }
  finishPromise = (async () => {
    clearTimeout(timeout);
    clearInterval(sampler);
    sample();
    const cleanup = managedProcess
      ? await terminateOwnedProcess({
          pid: managedProcess.pid,
          pgid: managedPgid,
          graceMs: killGraceMs,
        })
      : { termSent: false, killSent: false, remaining: 0 };
    sample();
    const lockReleased = lockPath ? releaseRunLock(lockPath, runId) : true;
    const result = {
      reason,
      exitCode,
      cleanup,
      lockReleased,
      durationMs: Date.now() - startedAt,
      peakRssMiB: Number((peakRssKiB / 1024).toFixed(1)),
      peakProcesses,
    };
    console.log(
      `[CoreStudio test] cleanup=${
        cleanup.remaining === 0 ? "complete" : "incomplete"
      } reason=${reason} termSent=${cleanup.termSent} killSent=${
        cleanup.killSent
      } remaining=${
        cleanup.remaining
      } lockReleased=${lockReleased} durationMs=${
        result.durationMs
      } peakRssMiB=${result.peakRssMiB} peakProcesses=${peakProcesses}`,
    );
    send({ type: "finished", result });
    setTimeout(() => process.exit(exitCode), 10).unref();
    return result;
  })();
  return finishPromise;
};

process.on("message", (message) => {
  if (message?.type === "start" && !managedProcess && !finishPromise) {
    const { invocation, options, lock } = message;
    lockPath = lock.lockPath;
    runId = lock.runId;
    killGraceMs = options.killGraceMs;
    startedAt = Date.now();
    managedProcess = spawn(invocation.command, invocation.args, {
      cwd: options.repoRoot,
      env: options.env,
      stdio: "inherit",
      detached: process.platform !== "win32",
    });
    managedPgid =
      process.platform === "win32" ? managedProcess.pid : managedProcess.pid;
    console.log(
      `[CoreStudio test] mainPID=${managedProcess.pid} mainPGID=${
        process.platform === "win32" ? "n/a" : managedPgid
      } command=${JSON.stringify([invocation.command, ...invocation.args])}`,
    );
    send({
      type: "started",
      testPid: managedProcess.pid,
      testPgid: process.platform === "win32" ? null : managedPgid,
    });
    sample();
    sampler = setInterval(sample, 250);
    if (options.timeoutMs > 0) {
      timeout = setTimeout(() => finish("timeout", 124), options.timeoutMs);
    }
    managedProcess.once("error", (error) => {
      console.error(`[CoreStudio test] spawn failed: ${error.message}`);
      void finish("spawn-error", 1);
    });
    managedProcess.once("exit", (code, signal) => {
      if (finishPromise) {
        return;
      }
      const exitCode =
        code ?? (signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1);
      void finish(
        signal ? `test-signal-${signal}` : `test-exit-${exitCode}`,
        exitCode,
      );
    });
  }

  if (message?.type === "cancel") {
    void finish(message.reason, message.exitCode);
  }
});

process.once("disconnect", () => {
  void finish("runner-disconnected", 1);
});
process.once("SIGINT", () => {
  void finish("supervisor-SIGINT", 130);
});
process.once("SIGTERM", () => {
  void finish("supervisor-SIGTERM", 143);
});
