#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
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
  mkdtempSync = fs.mkdtempSync,
  rmSync = fs.rmSync,
  tmpdir = os.tmpdir,
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

    const temporaryUserDataDir = mkdtempSync(
      path.join(tmpdir(), "corestudio-app-smoke-"),
    );
    let settled = false;
    let stderr = "";
    let child;
    try {
      child = spawn(
        executablePath,
        [`--user-data-dir=${temporaryUserDataDir}`],
        {
          env: {
            ...env,
            CORESTUDIO_SMOKE_TEST: "1",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    } catch (error) {
      rmSync(temporaryUserDataDir, { recursive: true, force: true });
      reject(error);
      return;
    }
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
      rmSync(temporaryUserDataDir, { recursive: true, force: true });
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

const runCodexIntegrationSmoke = ({
  executablePath,
  existsSync = fs.existsSync,
  mkdtempSync = fs.mkdtempSync,
  readFileSync = fs.readFileSync,
  rmSync = fs.rmSync,
  spawnSync = childProcess.spawnSync,
  tmpdir = os.tmpdir,
  env = process.env,
  stdout = process.stdout,
} = {}) => {
  if (!executablePath) {
    throw new Error("Packaged app executable is required.");
  }

  const appPath = path.resolve(path.dirname(executablePath), "..", "..");
  const integrationDir = path.join(
    appPath,
    "Contents",
    "Resources",
    "codex-integration",
  );
  const installerPath = path.join(integrationDir, "install.sh");
  const guidePath = path.join(integrationDir, "CODEX_INSTALLATION.md");
  const temporaryHome = mkdtempSync(
    path.join(tmpdir(), "corestudio-codex-smoke-"),
  );
  const smokeEnv = { ...env, HOME: temporaryHome };

  try {
    if (!existsSync(installerPath)) {
      throw new Error(`Codex integration installer is missing: ${installerPath}`);
    }
    if (!existsSync(guidePath)) {
      throw new Error(`Codex installation guide is missing: ${guidePath}`);
    }
    if (
      !readFileSync(guidePath, "utf8").includes(
        "# CoreStudio Codex 集成安装指南",
      )
    ) {
      throw new Error("Packaged Codex installation guide is invalid.");
    }

    const installResult = spawnSync("/bin/bash", [installerPath], {
      env: smokeEnv,
      encoding: "utf8",
    });
    if (installResult.status !== 0) {
      throw new Error(
        `Packaged Codex integration install failed: ${installResult.stderr || installResult.stdout}`,
      );
    }

    const cliPath = path.join(temporaryHome, ".local", "bin", "corestudio");
    const skillPath = path.join(
      temporaryHome,
      ".codex",
      "skills",
      "corestudio",
      "SKILL.md",
    );
    const manifestPath = path.join(
      temporaryHome,
      ".codex",
      "corestudio-integration.json",
    );
    for (const installedPath of [cliPath, skillPath, manifestPath]) {
      if (!existsSync(installedPath)) {
        throw new Error(`Codex integration output is missing: ${installedPath}`);
      }
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    const cliResult = spawnSync(
      cliPath,
      ["--version", "--json"],
      {
        env: smokeEnv,
        encoding: "utf8",
      },
    );
    let cliEnvelope;
    try {
      cliEnvelope = JSON.parse(cliResult.stdout.trim());
    } catch {
      throw new Error(
        `Installed CoreStudio CLI did not return JSON: ${cliResult.stderr || cliResult.stdout}`,
      );
    }
    if (
      cliResult.status !== 0 ||
      !cliEnvelope ||
      cliEnvelope.ok !== true ||
      !cliEnvelope.data ||
      cliEnvelope.data.appVersion !== manifest.installedFromAppVersion ||
      cliEnvelope.data.integrationVersion !== manifest.integrationVersion ||
      cliEnvelope.data.bridgeProtocolVersion !== manifest.bridgeProtocolVersion
    ) {
      throw new Error(
        "Installed CoreStudio CLI version contract does not match the integration manifest.",
      );
    }

    stdout.write("Packaged Codex integration smoke passed.\n");
  } finally {
    rmSync(temporaryHome, { recursive: true, force: true });
  }
};

const main = async () => {
  const executablePath = findPackagedAppExecutable();
  runCodexIntegrationSmoke({ executablePath });
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
  runCodexIntegrationSmoke,
  runPackagedSmoke,
};
