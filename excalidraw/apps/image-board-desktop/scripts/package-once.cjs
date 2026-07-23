#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const appRoot = path.resolve(__dirname, "..");
const releaseDir = path.join(appRoot, "release");
const statePath = path.join(releaseDir, ".corestudio-package-state.json");
const lockPath = path.join(releaseDir, ".corestudio-package.lock");
const packageJson = require(path.join(appRoot, "package.json"));

const productName = packageJson.build?.productName ?? "CoreStudio";
const version = packageJson.version;

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? appRoot,
    env: process.env,
    encoding: options.encoding,
    stdio: options.stdio,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
  return result.stdout ?? "";
};

const getGitRoot = () =>
  run("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();

const getSourceFingerprint = () => {
  const gitRoot = getGitRoot();
  const relativeAppRoot = path.relative(gitRoot, appRoot);
  const relativeWorkspaceRoot = path.relative(
    gitRoot,
    path.resolve(appRoot, "../.."),
  );
  const sourcePaths = [
    relativeAppRoot,
    path.join(relativeWorkspaceRoot, "packages"),
    path.join(relativeWorkspaceRoot, "package.json"),
    path.join(relativeWorkspaceRoot, "yarn.lock"),
    "docs/codex-integration.md",
  ];
  const hash = crypto.createHash("sha256");

  hash.update(
    run("git", ["rev-parse", "HEAD"], {
      cwd: gitRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    }),
  );
  hash.update(
    run("git", ["diff", "--binary", "HEAD", "--", ...sourcePaths], {
      cwd: gitRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    }),
  );

  const untrackedOutput = run(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z", "--", ...sourcePaths],
    {
      cwd: gitRoot,
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  const untrackedFiles = Buffer.from(untrackedOutput)
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();

  for (const relativePath of untrackedFiles) {
    hash.update(relativePath);
    hash.update(fs.readFileSync(path.join(gitRoot, relativePath)));
  }

  return hash.digest("hex");
};

const readState = () => {
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
};

const hasReusablePackage = ({
  state,
  fingerprint,
  version: expectedVersion,
  platform,
  arch,
  releaseDir: expectedReleaseDir,
}) =>
  Boolean(
    state &&
      state.fingerprint === fingerprint &&
      state.version === expectedVersion &&
      state.platform === platform &&
      state.arch === arch &&
      Array.isArray(state.artifacts) &&
      state.artifacts.length > 0 &&
      state.artifacts.every((artifact) =>
        fs.existsSync(path.join(expectedReleaseDir, artifact)),
      ),
  );

const collectReleaseArtifacts = () => {
  const artifactPrefix = `${productName}-${version}-${process.arch}`;
  const artifacts = [
    `${artifactPrefix}.dmg`,
    `${artifactPrefix}-mac.zip`,
  ];
  const appDirectory = fs
    .readdirSync(releaseDir, { withFileTypes: true })
    .find(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith("mac") &&
        fs.existsSync(path.join(releaseDir, entry.name, `${productName}.app`)),
    );

  if (appDirectory) {
    artifacts.push(path.join(appDirectory.name, `${productName}.app`));
  }

  const missingArtifacts = artifacts.filter(
    (artifact) => !fs.existsSync(path.join(releaseDir, artifact)),
  );
  if (missingArtifacts.length > 0 || !appDirectory) {
    throw new Error(
      `Packaging completed without the expected release artifacts: ${[
        ...missingArtifacts,
        ...(!appDirectory ? [`mac-*/${productName}.app`] : []),
      ].join(", ")}`,
    );
  }

  return artifacts;
};

const acquireLock = () => {
  fs.mkdirSync(releaseDir, { recursive: true });
  try {
    const lockFd = fs.openSync(lockPath, "wx");
    fs.writeFileSync(lockFd, String(process.pid));
    fs.closeSync(lockFd);
  } catch (error) {
    if (error?.code !== "EEXIST") {
      throw error;
    }

    const existingPid = Number(fs.readFileSync(lockPath, "utf8"));
    try {
      process.kill(existingPid, 0);
      throw new Error(
        `CoreStudio packaging is already running (pid ${existingPid}).`,
      );
    } catch (processError) {
      if (processError?.code !== "ESRCH") {
        throw processError;
      }
      fs.rmSync(lockPath, { force: true });
      acquireLock();
    }
  }
};

const runRawPackage = () => {
  const yarnScript = process.env.npm_execpath;
  const result =
    yarnScript && fs.existsSync(yarnScript)
      ? spawnSync(process.execPath, [yarnScript, "package:app:raw"], {
          cwd: appRoot,
          env: process.env,
          stdio: "inherit",
        })
      : spawnSync("yarn", ["package:app:raw"], {
          cwd: appRoot,
          env: process.env,
          stdio: "inherit",
        });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`package:app:raw exited with status ${result.status}`);
  }
};

const main = () => {
  const fingerprint = getSourceFingerprint();
  const forcePackage = process.env.CORESTUDIO_FORCE_PACKAGE === "1";

  if (
    !forcePackage &&
    hasReusablePackage({
      state: readState(),
      fingerprint,
      version,
      platform: process.platform,
      arch: process.arch,
      releaseDir,
    })
  ) {
    console.log(
      `CoreStudio ${version} already has a complete package for the current source. Reusing release artifacts.`,
    );
    return;
  }

  acquireLock();
  try {
    runRawPackage();
    const artifacts = collectReleaseArtifacts();
    fs.writeFileSync(
      statePath,
      `${JSON.stringify(
        {
          fingerprint,
          version,
          platform: process.platform,
          arch: process.arch,
          artifacts,
          completedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    fs.rmSync(lockPath, { force: true });
  }
};

module.exports = {
  hasReusablePackage,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
