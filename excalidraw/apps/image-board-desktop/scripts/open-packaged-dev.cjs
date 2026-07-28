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
} = require("./runtime-instance.cjs");

function buildPackagedPreviewLaunch(options = {}) {
  const appRoot = options.appRoot || path.resolve(__dirname, "..");
  const executablePath =
    options.executablePath ||
    path.join(
      appRoot,
      "release-dev",
      "mac-arm64",
      "CoreStudio Dev.app",
      "Contents",
      "MacOS",
      "CoreStudio Dev",
    );
  const env = options.env || process.env;
  if (!path.isAbsolute(appRoot) || !path.isAbsolute(executablePath)) {
    throw new Error(
      "CoreStudio packaged preview requires absolute app and executable paths.",
    );
  }
  const profilePath = path.join(appRoot, ".electron-preview-profile");
  const identityPath = path.join(profilePath, "runtime-identity.json");
  const sessionPath = path.join(profilePath, "agent-session.json");
  const debuggingPort = 9332;
  const bridgePort = 60913;
  const appName = "CoreStudio Preview";
  const instanceKind = "packaged-preview";
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
  return {
    command: executablePath,
    args: [
      `--user-data-dir=${profilePath}`,
      `--remote-debugging-port=${debuggingPort}`,
    ],
    cwd: appRoot,
    env: {
      ...env,
      CORESTUDIO_RUNTIME_MODE: "preview",
      CORESTUDIO_APP_NAME: appName,
      CORESTUDIO_WINDOW_TITLE: `CoreStudio · PACKAGED PREVIEW · ${buildIdentity.buildId}`,
      CORESTUDIO_AGENT_BRIDGE_PORT: String(bridgePort),
      CORESTUDIO_AGENT_SESSION_FILE: sessionPath,
      CORESTUDIO_SETTINGS_DIRECTORY: profilePath,
      CORESTUDIO_RUNTIME_IDENTITY_FILE: identityPath,
      CORESTUDIO_INSTANCE_KIND: instanceKind,
      CORESTUDIO_DEBUG_PORT: String(debuggingPort),
      CORESTUDIO_GIT_COMMIT: buildIdentity.gitCommit,
      CORESTUDIO_GIT_DIRTY: buildIdentity.gitDirty ? "1" : "0",
      CORESTUDIO_BUILD_ID: buildIdentity.buildId,
    },
    profilePath,
    identityPath,
    sessionPath,
    debuggingPort,
    bridgePort,
    appName,
    instanceKind,
    buildIdentity,
  };
}

function runPackagedPreview(options = {}) {
  const launch = buildPackagedPreviewLaunch(options);
  if (!fs.existsSync(launch.command)) {
    throw new Error(
      `CoreStudio Dev.app 不存在，请先运行 yarn package:dev:dir：${launch.command}`,
    );
  }
  assertRuntimeLaunchAvailable(
    {
      instanceKind: launch.instanceKind,
      executable: launch.command,
      userData: launch.profilePath,
      debugPort: launch.debuggingPort,
    },
    listProcesses(),
  );

  const child = childProcess.spawn(launch.command, launch.args, {
    cwd: launch.cwd,
    env: launch.env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  console.log("[desktop:preview-launch]");
  console.log(`Executable:    ${launch.command}`);
  console.log(`User data:     ${launch.profilePath}`);
  console.log(`Debug port:    ${launch.debuggingPort}`);
  console.log(`Agent Bridge:  127.0.0.1:${launch.bridgePort}`);
  console.log(`Agent session: ${launch.sessionPath}`);
  console.log(`Identity file: ${launch.identityPath}`);
  console.log(`Build ID:      ${launch.buildIdentity.buildId}`);
  console.log(`Main PID/PGID: ${child.pid}/${child.pid}`);
  return { launch, child };
}

if (require.main === module) {
  try {
    runPackagedPreview();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  buildPackagedPreviewLaunch,
  runPackagedPreview,
};
