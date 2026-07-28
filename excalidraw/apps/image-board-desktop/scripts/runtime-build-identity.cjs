const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function runGit(appRoot, args) {
  const result = childProcess.spawnSync("git", ["-C", appRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function resolveWorkspaceBuildIdentity(appRoot) {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(appRoot, "package.json"), "utf8"),
  );
  const gitCommit = runGit(appRoot, ["rev-parse", "--short=9", "HEAD"]);
  const gitDirty = Boolean(
    runGit(appRoot, ["status", "--porcelain", "--untracked-files=normal"]),
  );
  const normalizedCommit = gitCommit || "unknown";
  return {
    gitCommit: normalizedCommit,
    gitDirty,
    appVersion: String(packageJson.version || "0.0.0"),
    buildId: `${normalizedCommit}${gitDirty ? "-dirty" : ""}`,
  };
}

module.exports = {
  resolveWorkspaceBuildIdentity,
};
