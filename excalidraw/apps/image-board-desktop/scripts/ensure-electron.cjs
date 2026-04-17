#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

function ensureElectronBinary(options = {}) {
  const electronPath = options.electronPath || require("electron");
  const electronPackageDir =
    options.electronPackageDir ||
    path.dirname(require.resolve("electron/package.json"));
  const execPath = options.execPath || process.execPath;
  const cwd = options.cwd || process.cwd();
  const env = options.env || process.env;
  const existsSync = options.existsSync || fs.existsSync;
  const spawnSync = options.spawnSync || childProcess.spawnSync;

  if (existsSync(electronPath)) {
    return {
      changed: false,
      electronPath,
    };
  }

  const installScriptPath = path.join(electronPackageDir, "install.js");
  const result = spawnSync(execPath, [installScriptPath], {
    cwd,
    env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    const reason = result.error?.message ? `: ${result.error.message}` : "";
    throw new Error(`Electron binary reinstall failed${reason}`);
  }

  if (!existsSync(electronPath)) {
    throw new Error(
      `Electron binary is still missing after reinstall: ${electronPath}`,
    );
  }

  return {
    changed: true,
    electronPath,
  };
}

if (require.main === module) {
  try {
    const result = ensureElectronBinary();
    if (result.changed) {
      console.log(`Electron binary restored: ${result.electronPath}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  ensureElectronBinary,
};
