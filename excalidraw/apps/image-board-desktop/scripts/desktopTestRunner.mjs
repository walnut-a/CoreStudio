import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export const DEFAULT_MAX_WORKERS = 2;
export const DEFAULT_TIMEOUT_MS = 30 * 60 * 1_000;
export const DEFAULT_KILL_GRACE_MS = 2_000;

const parseInteger = (value, name, { allowZero = false } = {}) => {
  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < (allowZero ? 0 : 1)) {
    throw new Error(
      `${name} must be ${allowZero ? "a non-negative" : "a positive"} integer`,
    );
  }
  return parsed;
};

export const resolveDesktopTestOptions = ({
  argv,
  env,
  repoRoot,
  vitestPath,
}) => {
  const modeArgument = argv.find((argument) => argument.startsWith("--mode="));
  const mode = modeArgument?.slice("--mode=".length) ?? "run";
  if (!["run", "watch", "ci"].includes(mode)) {
    throw new Error(`Unsupported desktop test mode: ${mode}`);
  }

  const forwardedArgs = argv.filter((argument) => argument !== modeArgument);
  const watchFlags = new Set(["--watch", "--watch=true"]);
  if (mode !== "watch" && forwardedArgs.some((arg) => watchFlags.has(arg))) {
    throw new Error(
      "Watch mode is only available through corepack yarn test:desktop:watch",
    );
  }
  if (mode === "watch" && forwardedArgs.includes("--run")) {
    throw new Error("The watch entry cannot be combined with --run");
  }
  if (
    forwardedArgs.some(
      (argument) =>
        argument === "--maxWorkers" || argument.startsWith("--maxWorkers="),
    )
  ) {
    throw new Error(
      "Set CORESTUDIO_TEST_MAX_WORKERS instead of overriding --maxWorkers",
    );
  }

  const compatibleArgs = forwardedArgs.filter(
    (argument) => argument !== "--run" && argument !== "--watch=false",
  );
  const maxWorkers =
    parseInteger(
      env.CORESTUDIO_TEST_MAX_WORKERS,
      "CORESTUDIO_TEST_MAX_WORKERS",
    ) ?? DEFAULT_MAX_WORKERS;
  const timeoutMs =
    parseInteger(env.CORESTUDIO_TEST_TIMEOUT_MS, "CORESTUDIO_TEST_TIMEOUT_MS", {
      allowZero: true,
    }) ?? (mode === "watch" ? 0 : DEFAULT_TIMEOUT_MS);
  const killGraceMs =
    env.NODE_ENV === "test"
      ? parseInteger(
          env.CORESTUDIO_TEST_KILL_GRACE_MS,
          "CORESTUDIO_TEST_KILL_GRACE_MS",
          { allowZero: true },
        ) ?? 200
      : DEFAULT_KILL_GRACE_MS;

  return {
    mode,
    maxWorkers,
    timeoutMs,
    killGraceMs,
    allowConcurrent: env.CORESTUDIO_TEST_ALLOW_CONCURRENT === "1",
    forwardedArgs: compatibleArgs,
    repoRoot,
    vitestPath,
  };
};

export const buildVitestInvocation = (options) => ({
  command: process.execPath,
  args: [
    options.vitestPath,
    options.mode === "watch" ? "watch" : "run",
    "apps/image-board-desktop",
    `--maxWorkers=${options.maxWorkers}`,
    ...options.forwardedArgs,
  ],
});

export const resolveRepositoryIdentity = (repoRoot) => {
  const commonDirectory = execFileSync(
    "git",
    ["rev-parse", "--git-common-dir"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  ).trim();
  const worktree = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  const resolvedCommonDirectory = path.resolve(repoRoot, commonDirectory);
  return {
    repoIdentity: fs.realpathSync(resolvedCommonDirectory),
    worktree: fs.realpathSync(worktree),
  };
};

export const isProcessAlive = (pid) => {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
};

const readLock = (lockPath) => {
  try {
    return JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch {
    return undefined;
  }
};

const isLockOwnerAlive = (lock, processAlive) =>
  [lock?.runnerPid, lock?.supervisorPid, lock?.testPid].some((pid) =>
    processAlive(pid),
  );

export const releaseRunLock = (lockPath, runId) => {
  const current = readLock(lockPath);
  if (!current || current.runId !== runId) {
    return false;
  }
  try {
    fs.unlinkSync(lockPath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return true;
    }
    return false;
  }
};

export const tryAcquireRunLock = ({
  lockPath,
  metadata,
  isProcessAlive: processAlive = isProcessAlive,
}) => {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  let staleRecovered = false;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const descriptor = fs.openSync(lockPath, "wx", 0o600);
      try {
        fs.writeFileSync(descriptor, `${JSON.stringify(metadata, null, 2)}\n`);
      } finally {
        fs.closeSync(descriptor);
      }
      return {
        acquired: true,
        staleRecovered,
        release: () => releaseRunLock(lockPath, metadata.runId),
      };
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
    }

    const existing = readLock(lockPath);
    if (existing && isLockOwnerAlive(existing, processAlive)) {
      return {
        acquired: false,
        staleRecovered,
        existing,
        release: () => false,
      };
    }

    try {
      fs.unlinkSync(lockPath);
      staleRecovered = true;
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  throw new Error(`Could not acquire desktop test lock: ${lockPath}`);
};

export const updateOwnedRunLock = (lockPath, runId, patch) => {
  const current = readLock(lockPath);
  if (!current || current.runId !== runId) {
    return false;
  }
  const temporaryPath = `${lockPath}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(
    temporaryPath,
    `${JSON.stringify({ ...current, ...patch }, null, 2)}\n`,
    { mode: 0o600 },
  );
  fs.renameSync(temporaryPath, lockPath);
  return true;
};

export const formatActiveLockError = (lock, platform = process.platform) => {
  const ownerPid =
    lock.runnerPid ?? lock.supervisorPid ?? lock.testPid ?? "unknown";
  const exitCommand =
    platform === "win32"
      ? `taskkill /PID ${ownerPid} /T`
      : `kill -TERM ${ownerPid}`;
  return [
    "A full CoreStudio desktop test is already running.",
    `PID ${ownerPid}; started ${lock.startedAt ?? "unknown"}; mode ${
      lock.mode ?? "unknown"
    }.`,
    `Repository: ${lock.repoIdentity ?? "unknown"}`,
    `Wait for that task, or stop it with: ${exitCommand}`,
    "Only set CORESTUDIO_TEST_ALLOW_CONCURRENT=1 for an intentional exception.",
  ].join("\n");
};

const processGroupAlive = (pgid) => {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
};

const waitUntil = async (predicate, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!predicate()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return !predicate();
};

export const terminateOwnedProcess = async ({
  pid,
  pgid,
  platform = process.platform,
  graceMs = DEFAULT_KILL_GRACE_MS,
}) => {
  const result = {
    termSent: false,
    killSent: false,
    remaining: 0,
  };

  if (platform === "win32") {
    if (!isProcessAlive(pid)) {
      return result;
    }
    result.termSent = true;
    spawnSync("taskkill", ["/PID", String(pid), "/T"], { stdio: "ignore" });
    if (await waitUntil(() => isProcessAlive(pid), graceMs)) {
      return result;
    }
    result.killSent = true;
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    result.remaining = isProcessAlive(pid) ? 1 : 0;
    return result;
  }

  if (!processGroupAlive(pgid)) {
    return result;
  }
  try {
    process.kill(-pgid, "SIGTERM");
    result.termSent = true;
  } catch (error) {
    if (error?.code !== "ESRCH") {
      throw error;
    }
  }
  if (await waitUntil(() => processGroupAlive(pgid), graceMs)) {
    return result;
  }
  try {
    process.kill(-pgid, "SIGKILL");
    result.killSent = true;
  } catch (error) {
    if (error?.code !== "ESRCH") {
      throw error;
    }
  }
  await waitUntil(() => processGroupAlive(pgid), graceMs);
  result.remaining = processGroupAlive(pgid) ? 1 : 0;
  return result;
};

export const sampleOwnedProcessGroup = (pgid) => {
  if (process.platform === "win32") {
    return { rssKiB: 0, processCount: 0 };
  }
  try {
    const rows = execFileSync("ps", ["-axo", "pgid=,rss="], {
      encoding: "utf8",
    });
    let rssKiB = 0;
    let processCount = 0;
    for (const row of rows.split("\n")) {
      const match = row.match(/^\s*(\d+)\s+(\d+)\s*$/);
      if (match && Number(match[1]) === pgid) {
        rssKiB += Number(match[2]);
        processCount += 1;
      }
    }
    return { rssKiB, processCount };
  } catch {
    return { rssKiB: 0, processCount: 0 };
  }
};

export const createRunMetadata = ({
  repoIdentity,
  worktree,
  mode,
  maxWorkers,
}) => ({
  schemaVersion: 1,
  repoIdentity,
  worktree,
  runId: randomUUID(),
  runnerPid: process.pid,
  mode,
  maxWorkers,
  startedAt: new Date().toISOString(),
});
