#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_RENDERER_URL = "http://127.0.0.1:5174";
const DEFAULT_DEBUGGING_PORT = 9331;
const DEFAULT_WINDOW_TITLE = "CoreStudio · DEV";

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
  const windowTitle = DEFAULT_WINDOW_TITLE;

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
    },
    profilePath,
    rendererUrl,
    debuggingPort,
    windowTitle,
  };
}

function runDevElectron(options = {}) {
  const launch = buildDevElectronLaunch(options);
  if (!fs.existsSync(launch.command)) {
    throw new Error(`Electron executable not found: ${launch.command}`);
  }

  console.log("[desktop:dev-launch]");
  console.log(`Project:       ${launch.cwd}`);
  console.log(`Electron:      ${launch.command}`);
  console.log(`User data:     ${launch.profilePath}`);
  console.log(`Renderer:      ${launch.rendererUrl}`);
  console.log(`Debug port:    ${launch.debuggingPort}`);
  console.log(`Window title:  ${launch.windowTitle}`);

  const child = childProcess.spawn(launch.command, launch.args, {
    cwd: launch.cwd,
    env: launch.env,
    stdio: "inherit",
  });
  const signals = ["SIGINT", "SIGTERM"];
  const signalHandlers = new Map(
    signals.map((signal) => [
      signal,
      () => {
        if (!child.killed) {
          child.kill(signal);
        }
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
