#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const { execFileSync } = require("node:child_process");
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../../..");

const allowedExtensions = new Set([
  ".cjs",
  ".css",
  ".cts",
  ".html",
  ".js",
  ".json",
  ".map",
  ".md",
  ".mjs",
  ".mts",
  ".plist",
  ".scss",
  ".sh",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

const rules = [
  {
    name: "openai-or-compatible-key",
    pattern: /\bsk-(?:proj|or-v1|ai-v1|ss-v1)-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  },
  {
    name: "stored-plain-api-key",
    pattern: /\bplain:[A-Za-z0-9_./+=-]{24,}\b/g,
  },
  {
    name: "authorization-header-secret",
    pattern: /\b(?:Bearer|Key)\s+[A-Za-z0-9_.:/+=-]{32,}\b/g,
  },
  {
    name: "generic-secret-assignment",
    pattern:
      /\b(?:api[_-]?key|authorization|bearer|token|secret|password)\b["']?\s*[:=]\s*["'`]([A-Za-z0-9_./+=:-]{24,})["'`]/gi,
  },
];

// Excalidraw's published Algolia search-only credential is shipped to browsers.
const publicSearchKeyHash =
  "dc83228112095f1d7594295b69833d2e5f2adf1f968ba6cd4be9b97c0e01980c";
const isReviewedValue = (file, value) =>
  path.relative(repoRoot, file) ===
    "excalidraw/dev-docs/docusaurus.config.js" &&
    require("node:crypto").createHash("sha256").update(value).digest("hex") ===
      publicSearchKeyHash;

const getLineNumber = (text, index) => text.slice(0, index).split("\n").length;

const isPotentialTextFile = (filePath) => {
  const basename = path.basename(filePath);
  const extension = path.extname(filePath);
  return (
    basename === ".env" ||
    basename.startsWith(".env.") ||
    basename === "app.asar" ||
    basename === "CodeResources" ||
    allowedExtensions.has(extension)
  );
};

const scanSecretFiles = async (files) => {
  const findings = [];

  for (const filePath of files) {
    const basename = path.basename(filePath);
    const matchedRanges = [];
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      continue;
    }

    if (!stat.isFile()) {
      continue;
    }

    if (!isPotentialTextFile(filePath)) {
      continue;
    }

    if (basename === "image-board-settings.json") {
      findings.push({
        filePath,
        line: 1,
        rule: "local-settings-file",
        excerpt:
          "image-board-settings.json should never be committed or packaged",
      });
      continue;
    }

    const text = (await fs.readFile(filePath)).toString("utf8");
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(text)) !== null) {
        if (isReviewedValue(filePath, match[1] ?? match[0])) continue;
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        const overlapsExistingMatch = matchedRanges.some(
          (range) => matchStart < range.end && matchEnd > range.start,
        );
        if (overlapsExistingMatch) {
          continue;
        }

        matchedRanges.push({
          start: matchStart,
          end: matchEnd,
        });
        findings.push({
          filePath,
          line: getLineNumber(text, match.index),
          rule: rule.name,
          excerpt: "[REDACTED]",
        });
      }
    }
  }

  return findings;
};

const walkFiles = async (root, skipDirectories) => {
  const files = [];
  let stat;
  try {
    stat = await fs.stat(root);
  } catch {
    return files;
  }

  if (stat.isFile()) {
    return [root];
  }

  if (!stat.isDirectory()) {
    return files;
  }

  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirectories?.has(entry.name))
        files.push(...(await walkFiles(entryPath, skipDirectories)));
      continue;
    }
    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
};

const generatedDirectories = new Set([
  ".git",
  ".git-backups",
  ".worktrees",
  ".electron-dev-profile",
  ".electron-preview-profile",
  ".turbo",
  ".vite",
  "build",
  "coverage",
  "dist",
  "dist-electron",
  "node_modules",
  "release",
  "release-dev",
]);

const collectSourceFiles = async () => {
  const repositoryFiles = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    },
  )
    .split("\0")
    .filter(isPotentialTextFile)
    .map((name) => path.join(repoRoot, name));
  // Preserve the desktop source scan, including local .env and settings files
  // that would otherwise disappear through Git's ignore rules.
  const desktopFiles = await walkFiles(appRoot, generatedDirectories);
  return [
    ...new Set([
      ...repositoryFiles,
      ...desktopFiles.filter(isPotentialTextFile),
    ]),
  ];
};

const collectPackageInputFiles = async () => {
  const roots = [
    path.join(appRoot, "dist"),
    path.join(appRoot, "dist-electron"),
    path.join(appRoot, "bin"),
    ...require("../package.json").build.extraResources.map(({ from }) =>
      path.resolve(appRoot, from),
    ),
  ];
  const files = [];
  for (const root of roots) {
    const inputs = (await walkFiles(root)).filter(isPotentialTextFile);
    if (!inputs.length) throw new Error(`Missing build inputs: ${root}`);
    files.push(...inputs);
  }
  return files;
};

const collectReleaseFiles = async (
  releaseDir = path.join(appRoot, "release"),
) => {
  const files = [];
  for (const entry of await fs.readdir(releaseDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^mac(?:-|$)/.test(entry.name)) continue;
    const contents = path.join(
      releaseDir,
      entry.name,
      "CoreStudio.app",
      "Contents",
    );
    const resources = path.join(contents, "Resources");
    for (const file of [
      path.join(contents, "Info.plist"),
      path.join(resources, "app.asar"),
    ]) {
      if (!(await fs.stat(file)).isFile())
        throw new Error(`Missing release input: ${file}`);
    }
    files.push(...(await walkFiles(contents)).filter(isPotentialTextFile));
  }
  if (!files.length) throw new Error("No CoreStudio release bundle found.");
  return files;
};

const formatFindings = (findings) =>
  findings
    .map(
      (finding) =>
        `${path.relative(repoRoot, finding.filePath)}:${finding.line} ` +
        `[${finding.rule}] ${finding.excerpt}`,
    )
    .join("\n");

const parseModes = (args) => {
  const selectedModes = new Set(
    args
      .filter((arg) => arg.startsWith("--"))
      .map((arg) => arg.replace(/^--/, "")),
  );

  if (selectedModes.size === 0 || selectedModes.has("all")) {
    return {
      source: true,
      packageInputs: true,
      release: true,
    };
  }

  return {
    source: selectedModes.has("source"),
    packageInputs:
      selectedModes.has("package") || selectedModes.has("package-inputs"),
    release: selectedModes.has("release"),
  };
};

const run = async () => {
  const modes = parseModes(process.argv.slice(2));
  const files = [];

  if (modes.source) {
    files.push(...(await collectSourceFiles()));
  }
  if (modes.packageInputs) {
    files.push(...(await collectPackageInputFiles()));
  }
  if (modes.release) {
    files.push(...(await collectReleaseFiles()));
  }

  const uniqueFiles = [...new Set(files)];
  const findings = await scanSecretFiles(uniqueFiles);

  if (findings.length > 0) {
    console.error("Secret scan failed. Remove these values before release:\n");
    console.error(formatFindings(findings));
    process.exitCode = 1;
    return;
  }

  console.log(`Secret scan passed: ${uniqueFiles.length} files checked.`);
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  collectPackageInputFiles,
  collectReleaseFiles,
  collectSourceFiles,
  scanSecretFiles,
};
