#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");

const REQUIRED_IDENTITY_FIELDS = [
  "schemaVersion",
  "instanceKind",
  "runtimeMode",
  "appName",
  "executable",
  "appPath",
  "userData",
  "rendererUrl",
  "debugPort",
  "bridgePort",
  "sessionPath",
  "identityPath",
  "mainPid",
  "mainPgid",
  "gitCommit",
  "gitDirty",
  "appVersion",
  "buildId",
];

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function listProcesses() {
  const result = childProcess.spawnSync(
    "/bin/ps",
    ["-ax", "-o", "pid=,ppid=,pgid=,command="],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Unable to inspect processes: ${result.stderr.trim()}`);
  }
  return result.stdout
    .split("\n")
    .map((line) => {
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
      return match
        ? {
            pid: Number(match[1]),
            ppid: Number(match[2]),
            pgid: Number(match[3]),
            command: match[4],
          }
        : null;
    })
    .filter(Boolean);
}

function describeProcesses(processes) {
  return processes
    .map(
      (processInfo) =>
        `PID=${processInfo.pid} PGID=${processInfo.pgid} command=${processInfo.command}`,
    )
    .join("\n");
}

function assertCompleteIdentity(identity) {
  const missing = REQUIRED_IDENTITY_FIELDS.filter(
    (field) =>
      identity?.[field] === undefined ||
      identity?.[field] === null ||
      identity?.[field] === "",
  );
  if (missing.length > 0) {
    throw new Error(
      `Runtime identity is incomplete (${missing.join(
        ", ",
      )}). A display name is never sufficient evidence.`,
    );
  }
}

function processMatchesIdentity(processInfo, identity) {
  const command = processInfo.command;
  return (
    processInfo.pid === identity.mainPid &&
    processInfo.pgid === identity.mainPgid &&
    command.includes(identity.executable) &&
    command.includes(`--user-data-dir=${identity.userData}`) &&
    command.includes(`--remote-debugging-port=${identity.debugPort}`) &&
    (identity.instanceKind === "packaged-preview" ||
      command.includes(identity.appPath))
  );
}

function assertRuntimeLaunchAvailable(input, processes) {
  const conflicts = processes.filter((processInfo) => {
    const command = processInfo.command;
    if (!command.includes(input.executable)) {
      return false;
    }
    if (input.instanceKind === "packaged-preview") {
      return true;
    }
    return (
      command.includes(`--user-data-dir=${input.userData}`) ||
      command.includes(`--remote-debugging-port=${input.debugPort}`) ||
      Boolean(input.appPath && command.includes(input.appPath))
    );
  });
  if (conflicts.length === 0) {
    return;
  }
  const exits = [
    ...new Set(
      conflicts.map((processInfo) => `kill -TERM -- -${processInfo.pgid}`),
    ),
  ].join("\n");
  throw new Error(
    `Runtime launch conflict for ${
      input.instanceKind
    }. Refusing to guess or reuse by display name.\n${describeProcesses(
      conflicts,
    )}\nVerify, then exit the exact group:\n${exits}`,
  );
}

function selectRuntimeInstance(identities, options = {}) {
  const complete = identities.map((identity) => {
    assertCompleteIdentity(identity);
    return identity;
  });
  if (!options.expectedKind && complete.length > 1) {
    throw new Error(
      "Multiple CoreStudio runtime instances were found. Refusing to auto-select; pass --expect source-dev or --expect packaged-preview.",
    );
  }
  const candidates = options.expectedKind
    ? complete.filter(
        (identity) => identity.instanceKind === options.expectedKind,
      )
    : complete;
  if (candidates.length !== 1) {
    const conflicts = describeProcesses(options.processes || []);
    throw new Error(
      `Expected exactly one ${
        options.expectedKind || "CoreStudio"
      } runtime identity, found ${candidates.length}.${
        conflicts ? `\n${conflicts}` : ""
      }`,
    );
  }
  const identity = candidates[0];
  const matchingProcess = (options.processes || []).find(
    (processInfo) => processInfo.pid === identity.mainPid,
  );
  if (!matchingProcess || !processMatchesIdentity(matchingProcess, identity)) {
    const conflicts = describeProcesses(
      matchingProcess ? [matchingProcess] : options.processes || [],
    );
    throw new Error(
      `Runtime identity conflict. Refusing GUI automation.${
        conflicts ? `\n${conflicts}` : ""
      }\nExit only after verification: kill -TERM -- -${identity.mainPgid}`,
    );
  }
  return identity;
}

async function terminateOwnedProcessGroup(input, dependencies = {}) {
  const kill = dependencies.kill || process.kill;
  const inspect = dependencies.listProcesses || listProcesses;
  const groupMembers = () =>
    inspect().filter((processInfo) => processInfo.pgid === input.pgid);
  if (!groupMembers().some((processInfo) => processInfo.pid === input.pid)) {
    throw new Error(
      `Refusing cleanup because PID ${input.pid} is not in recorded PGID ${input.pgid}.`,
    );
  }
  kill(process.platform === "win32" ? input.pid : -input.pgid, "SIGTERM");
  await sleep(dependencies.graceMs ?? 1500);
  let remaining = groupMembers();
  if (remaining.length > 0 && dependencies.allowKill !== false) {
    kill(process.platform === "win32" ? input.pid : -input.pgid, "SIGKILL");
    await sleep(dependencies.killWaitMs ?? 250);
    remaining = groupMembers();
  }
  return { remaining: remaining.length };
}

function readRuntimeIdentities(appRoot) {
  return [".electron-dev-profile", ".electron-preview-profile"]
    .map((profileName) =>
      path.join(appRoot, profileName, "runtime-identity.json"),
    )
    .filter((identityPath) => fs.existsSync(identityPath))
    .map((identityPath) => {
      try {
        return JSON.parse(fs.readFileSync(identityPath, "utf8"));
      } catch (error) {
        throw new Error(
          `Unable to read runtime identity ${identityPath}: ${error.message}`,
        );
      }
    });
}

async function runCli(argv = process.argv.slice(2)) {
  const appRoot = path.resolve(__dirname, "..");
  const expectedIndex = argv.indexOf("--expect");
  const expectedKind = expectedIndex >= 0 ? argv[expectedIndex + 1] : undefined;
  const identities = readRuntimeIdentities(appRoot);
  const processes = listProcesses();
  const identity = selectRuntimeInstance(identities, {
    expectedKind,
    processes,
  });
  if (argv.includes("--stop")) {
    const cleanup = await terminateOwnedProcessGroup(
      { pid: identity.mainPid, pgid: identity.mainPgid },
      { listProcesses },
    );
    if (cleanup.remaining !== 0) {
      throw new Error(
        `Runtime cleanup incomplete: PGID=${identity.mainPgid} remaining=${cleanup.remaining}`,
      );
    }
    console.log(
      `[corestudio:runtime-cleanup] PGID=${identity.mainPgid} remaining=0`,
    );
    return;
  }
  console.log(JSON.stringify(identity, null, 2));
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  REQUIRED_IDENTITY_FIELDS,
  assertRuntimeLaunchAvailable,
  listProcesses,
  selectRuntimeInstance,
  terminateOwnedProcessGroup,
};
