#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const {
  resolveWorkspaceBuildIdentity,
} = require("./runtime-build-identity.cjs");
const {
  assertRuntimeLaunchAvailable,
  listProcesses,
  terminateOwnedProcessGroup,
} = require("./runtime-instance.cjs");

const DEFAULT_RENDERER_URL = "http://127.0.0.1:5174";
const DEFAULT_DEBUGGING_PORT = 9331;
const DEFAULT_BRIDGE_PORT = 60910;
const DEFAULT_APP_NAME = "CoreStudio Dev";

function buildDevElectronLaunch(options = {}) {
  const appRoot = options.appRoot || path.resolve(__dirname, "..");
  const electronPath = options.electronPath || require("electron");
  const env = options.env || process.env;

  if (!path.isAbsolute(appRoot) || !path.isAbsolute(electronPath)) {
    throw new Error(
      "CoreStudio desktop development requires absolute app and Electron paths.",
    );
  }

  const profilePath = path.join(appRoot, ".electron-dev-profile");
  const rendererUrl = DEFAULT_RENDERER_URL;
  const debuggingPort = DEFAULT_DEBUGGING_PORT;
  const bridgePort = DEFAULT_BRIDGE_PORT;
  const sessionPath = path.join(profilePath, "agent-session.json");
  const identityPath = path.join(profilePath, "runtime-identity.json");
  const appName = DEFAULT_APP_NAME;
  const instanceKind = "source-dev";
  let buildIdentity = options.buildIdentity;
  if (!buildIdentity) {
    try {
      buildIdentity = resolveWorkspaceBuildIdentity(appRoot);
    } catch {
      buildIdentity = {
        gitCommit: "unknown",
        gitDirty: false,
        appVersion: "0.0.0",
        buildId: "unknown",
      };
    }
  }
  const windowTitle = `CoreStudio · SOURCE DEV · ${buildIdentity.buildId}`;

  return {
    command: electronPath,
    args: [
      `--user-data-dir=${profilePath}`,
      `--remote-debugging-port=${debuggingPort}`,
      appRoot,
    ],
    cwd: appRoot,
    env: {
      ...env,
      ELECTRON_RENDERER_URL: rendererUrl,
      CORESTUDIO_WINDOW_TITLE: windowTitle,
      CORESTUDIO_RUNTIME_MODE: "development",
      CORESTUDIO_APP_NAME: appName,
      CORESTUDIO_AGENT_BRIDGE_PORT: String(bridgePort),
      CORESTUDIO_AGENT_SESSION_FILE: sessionPath,
      CORESTUDIO_SETTINGS_DIRECTORY: profilePath,
      CORESTUDIO_RUNTIME_IDENTITY_FILE: identityPath,
      CORESTUDIO_INSTANCE_KIND: instanceKind,
      CORESTUDIO_DEBUG_PORT: String(debuggingPort),
      CORESTUDIO_GIT_COMMIT: buildIdentity.gitCommit,
      CORESTUDIO_GIT_DIRTY: buildIdentity.gitDirty ? "1" : "0",
      CORESTUDIO_BUILD_ID: buildIdentity.buildId,
      CORESTUDIO_LAUNCHER_PID: String(process.pid),
    },
    profilePath,
    rendererUrl,
    debuggingPort,
    windowTitle,
    bridgePort,
    sessionPath,
    identityPath,
    appName,
    instanceKind,
    buildIdentity,
  };
}

function runDevElectron(options = {}) {
  const launch = buildDevElectronLaunch(options);
  if (!fs.existsSync(launch.command)) {
    throw new Error(`Electron executable not found: ${launch.command}`);
  }
  assertRuntimeLaunchAvailable(
    {
      instanceKind: launch.instanceKind,
      executable: launch.command,
      appPath: launch.cwd,
      userData: launch.profilePath,
      debugPort: launch.debuggingPort,
    },
    listProcesses(),
  );

  console.log("[desktop:dev-launch]");
  console.log(`Project:       ${launch.cwd}`);
  console.log(`Electron:      ${launch.command}`);
  console.log(`User data:     ${launch.profilePath}`);
  console.log(`Renderer:      ${launch.rendererUrl}`);
  console.log(`Debug port:    ${launch.debuggingPort}`);
  console.log(`Window title:  ${launch.windowTitle}`);
  console.log(`App name:      ${launch.appName}`);
  console.log(`Agent Bridge:  127.0.0.1:${launch.bridgePort}`);
  console.log(`Agent session: ${launch.sessionPath}`);
  console.log(`Identity file: ${launch.identityPath}`);
  console.log(`Git commit:    ${launch.buildIdentity.gitCommit}`);
  console.log(`Git dirty:     ${launch.buildIdentity.gitDirty}`);
  console.log(`Build ID:      ${launch.buildIdentity.buildId}`);

  const child = childProcess.spawn(launch.command, launch.args, {
    cwd: launch.cwd,
    env: launch.env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  let cleanupPromise;
  const cleanup = (signal) => {
    if (!child.pid) {
      return Promise.resolve({ remaining: 0 });
    }
    if (!cleanupPromise) {
      cleanupPromise = terminateOwnedProcessGroup(
        { pid: child.pid, pgid: child.pid },
        { allowKill: true },
      ).catch((error) => {
        console.error(`[desktop:dev-cleanup-failed] ${error.message}`);
        return { remaining: -1 };
      });
    }
    return cleanupPromise.then((result) => {
      console.log(
        `[desktop:dev-cleanup] signal=${signal} PGID=${child.pid} remaining=${result.remaining}`,
      );
      return result;
    });
  };
  const signals = ["SIGINT", "SIGTERM"];
  const signalHandlers = new Map(
    signals.map((signal) => [
      signal,
      () => {
        void cleanup(signal);
      },
    ]),
  );

  for (const [signal, handler] of signalHandlers) {
    process.on(signal, handler);
  }

  child.once("error", (error) => {
    console.error(`[desktop:dev-launch-failed] ${error.message}`);
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    for (const [forwardedSignal, handler] of signalHandlers) {
      process.off(forwardedSignal, handler);
    }
    if (signal) {
      console.log(`[desktop:dev-exit] signal=${signal}`);
      process.exitCode = 1;
      return;
    }
    console.log(`[desktop:dev-exit] code=${code ?? 0}`);
    process.exitCode = code ?? 0;
  });
}

if (require.main === module) {
  try {
    runDevElectron();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  buildDevElectronLaunch,
  runDevElectron,
};
