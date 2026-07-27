#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const executablePath = path.join(
  appRoot,
  "release-dev",
  "mac-arm64",
  "CoreStudio Dev.app",
  "Contents",
  "MacOS",
  "CoreStudio Dev",
);

if (!fs.existsSync(executablePath)) {
  console.error(
    `CoreStudio Dev.app 不存在，请先运行 yarn package:dev:dir：${executablePath}`,
  );
  process.exit(1);
}

const child = childProcess.spawn(executablePath, [], {
  cwd: appRoot,
  detached: true,
  stdio: "ignore",
});
child.unref();

console.log(`已启动：${executablePath}`);
