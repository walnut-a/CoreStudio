#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const FORBIDDEN_PATH_RULES = [
  {
    label: "macOS user directory",
    pattern: /\/Users\//g,
  },
  {
    label: "Linux user directory",
    pattern: /\/home\//g,
  },
  {
    label: "Windows user directory",
    pattern: /[A-Za-z]:[\\/]+Users[\\/]+/g,
  },
];

const collectFiles = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Build path scan target does not exist: ${targetPath}`);
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return [targetPath];
  }
  if (!stat.isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(targetPath, { withFileTypes: true })
    .flatMap((entry) => collectFiles(path.join(targetPath, entry.name)));
};

const findForbiddenBuildPaths = ({ roots }) => {
  const findings = [];

  for (const filePath of roots.flatMap(collectFiles)) {
    const contents = fs.readFileSync(filePath).toString("utf8");
    for (const rule of FORBIDDEN_PATH_RULES) {
      rule.pattern.lastIndex = 0;
      const matches = contents.match(rule.pattern);
      if (matches?.length) {
        findings.push({
          filePath,
          label: rule.label,
          occurrences: matches.length,
        });
      }
    }
  }

  return findings;
};

const assertNoForbiddenBuildPaths = ({ roots }) => {
  const findings = findForbiddenBuildPaths({ roots });
  if (!findings.length) {
    return;
  }

  const details = findings
    .slice(0, 20)
    .map(
      ({ filePath, label, occurrences }) =>
        `${path.relative(appRoot, filePath)}: ${label} (${occurrences})`,
    )
    .join("\n");
  throw new Error(
    `Build output contains developer-specific paths:\n${details}`,
  );
};

const findPackagedAsarPaths = () => {
  const releaseDir = path.join(appRoot, "release");
  if (!fs.existsSync(releaseDir)) {
    return [];
  }

  return fs
    .readdirSync(releaseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("mac"))
    .map((entry) =>
      path.join(
        releaseDir,
        entry.name,
        "CoreStudio.app",
        "Contents",
        "Resources",
        "app.asar",
      ),
    )
    .filter((asarPath) => fs.existsSync(asarPath));
};

const main = () => {
  const [mode, ...extraArgs] = process.argv.slice(2);
  if (extraArgs.length || (mode !== "--build" && mode !== "--release")) {
    throw new Error(
      "Usage: node scripts/check-build-paths.cjs --build|--release",
    );
  }

  const roots =
    mode === "--build"
      ? [path.join(appRoot, "dist"), path.join(appRoot, "dist-electron")]
      : findPackagedAsarPaths();
  if (!roots.length) {
    throw new Error(
      mode === "--release"
        ? "No packaged CoreStudio app.asar was found under release/mac*."
        : "No build outputs were found.",
    );
  }

  assertNoForbiddenBuildPaths({ roots });
  console.log(
    `CoreStudio ${mode === "--build" ? "build" : "packaged"} path scan passed.`,
  );
};

module.exports = {
  FORBIDDEN_PATH_RULES,
  assertNoForbiddenBuildPaths,
  findForbiddenBuildPaths,
  findPackagedAsarPaths,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
