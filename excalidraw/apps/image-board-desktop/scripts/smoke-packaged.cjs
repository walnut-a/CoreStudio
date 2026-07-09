#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const packageJson = require(path.join(appRoot, "package.json"));
const productName = packageJson.build?.productName ?? "CoreStudio";
const SMOKE_READY_SIGNAL = "[corestudio:smoke-ready]";

const getFileMtime = (filePath, statSync = fs.statSync) =>
  statSync(filePath).mtimeMs;

const sortNewestFirst = (files, statSync = fs.statSync) =>
  [...files].sort(
    (left, right) => getFileMtime(right, statSync) - getFileMtime(left, statSync),
  );

const findPackagedAppExecutable = ({
  appRoot: root = appRoot,
  platform = process.platform,
  productName: name = productName,
  existsSync = fs.existsSync,
  readdirSync = fs.readdirSync,
  statSync = fs.statSync,
} = {}) => {
  if (process.env.CORESTUDIO_APP_EXECUTABLE) {
    return path.resolve(process.env.CORESTUDIO_APP_EXECUTABLE);
  }

  if (platform !== "darwin") {
    throw new Error("Packaged smoke test currently supports macOS app bundles.");
  }

  const releaseDir = path.join(root, "release");
  const explicitAppPath = process.env.CORESTUDIO_APP_PATH
    ? path.resolve(process.env.CORESTUDIO_APP_PATH)
    : null;
  const candidates = explicitAppPath
    ? [explicitAppPath]
    : readdirSync(releaseDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("mac"))
        .map((entry) => path.join(releaseDir, entry.name, `${name}.app`));
  const appPath = sortNewestFirst(
    candidates.filter((candidate) => existsSync(candidate)),
    statSync,
  )[0];

  if (!appPath) {
    throw new Error(`No ${name}.app bundle found under ${releaseDir}`);
  }

  const executablePath = path.join(appPath, "Contents", "MacOS", name);
  if (!existsSync(executablePath)) {
    throw new Error(`Packaged app executable does not exist: ${executablePath}`);
  }

  return executablePath;
};

const runPackagedSmoke = ({
  executablePath,
  spawn = childProcess.spawn,
  setTimeout: setTimer = setTimeout,
  clearTimeout: clearTimer = clearTimeout,
  env = process.env,
  timeoutMs = 30_000,
  stdout = process.stdout,
  stderr: stderrWriter = process.stderr,
} = {}) =>
  new Promise((resolve, reject) => {
    if (!executablePath) {
      reject(new Error("Packaged app executable is required."));
      return;
    }

    let settled = false;
    let stderr = "";
    const child = spawn(executablePath, [], {
      env: {
        ...env,
        CORESTUDIO_SMOKE_TEST: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timeout = setTimer(() => {
      rejectOnce(
        new Error(
          `Packaged smoke timed out after ${timeoutMs}ms before renderer loaded.`,
        ),
      );
    }, timeoutMs);

    const cleanup = () => {
      clearTimer(timeout);
      child.kill();
    };
    const resolveOnce = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };
    const rejectOnce = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout.write(text);
      if (text.includes(SMOKE_READY_SIGNAL)) {
        resolveOnce();
      }
    });
    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr += text;
      stderrWriter.write(text);
    });
    child.on("error", rejectOnce);
    child.on("exit", (code, signal) => {
      if (!settled) {
        rejectOnce(
          new Error(
            `Packaged app exited before smoke-ready signal: code=${code} signal=${signal}${
              stderr ? `\n${stderr}` : ""
            }`,
          ),
        );
      }
    });
  });

const main = async () => {
  const executablePath = findPackagedAppExecutable();
  console.log(`Running packaged smoke: ${executablePath}`);
  await runPackagedSmoke({ executablePath });
  console.log("Packaged smoke passed.");
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  SMOKE_READY_SIGNAL,
  findPackagedAppExecutable,
  runPackagedSmoke,
};
