#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  runIntegrationSetup,
} = require("../dist-electron/agentIntegrationSetup.js");
const appRoot = path.resolve(__dirname, "..");
if (process.platform !== "darwin" || path.basename(appRoot) !== "app.asar") {
  console.error("请使用已安装 CoreStudio 应用包内的接入安装入口。");
  process.exitCode = 1;
} else {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(appRoot, "package.json"), "utf8"),
  );
  runIntegrationSetup(process.argv.slice(2), {
    homeDir: os.homedir(),
    resourcesPath: path.dirname(appRoot),
    appVersion: version,
  })
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`);
      process.exitCode = result.ok ? 0 : 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
