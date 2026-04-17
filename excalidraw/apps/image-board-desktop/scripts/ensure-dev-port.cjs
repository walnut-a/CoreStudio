#!/usr/bin/env node

const childProcess = require("child_process");

function parseLsofOutput(output) {
  const lines = String(output || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  let pid = "";
  let command = "";

  for (const line of lines) {
    if (line.startsWith("p")) {
      pid = line.slice(1);
      continue;
    }
    if (line.startsWith("c")) {
      command = line.slice(1);
    }
  }

  return { pid, command };
}

function ensureDevPortAvailable(options = {}) {
  const port = options.port || 5174;
  const spawnSync = options.spawnSync || childProcess.spawnSync;
  const result = spawnSync(
    "lsof",
    ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpc"],
    {
      encoding: "utf8",
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    return;
  }

  const { pid, command } = parseLsofOutput(result.stdout);
  const details = [pid && `PID ${pid}`, command].filter(Boolean).join(" ");
  const suffix = details ? `（${details}）` : "";

  throw new Error(
    `开发端口 ${port} 已经被占用${suffix}。\n请先关闭旧的桌面开发实例，再重新执行 yarn start:desktop。`,
  );
}

if (require.main === module) {
  try {
    ensureDevPortAvailable();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  ensureDevPortAvailable,
};
