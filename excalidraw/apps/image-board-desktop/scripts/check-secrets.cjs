#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../..");

const maxTextFileBytes = 24 * 1024 * 1024;
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

const skippedDirectoryNames = new Set([
  ".git",
  ".turbo",
  ".vite",
  "build",
  "coverage",
  "dist",
  "dist-electron",
  "node_modules",
  "release",
]);

const allowlistMarkers = [
  "dummy",
  "example",
  "fake",
  "fixture",
  "mock",
  "placeholder",
  "sample",
  "http://",
  "https://",
  "test-api-key",
  "test-key",
  "sk-ai-v1-test",
  "openai-key",
  "openrouter-key",
  "ark-key",
  "zenmux-key",
  "legacy-key",
  "saved-key",
  "updated-key",
  "initial-key",
  "process.env",
  "import.meta.env",
  "$",
  "<",
];

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
      /\b(?:api[_-]?key|authorization|bearer|token|secret|password)\b[\w\s"'`.-]{0,40}[:=]\s*["'`]([A-Za-z0-9_./+=:-]{24,})["'`]/gi,
  },
];

const shouldAllowLine = (line) => {
  const lowerLine = line.toLowerCase();
  return allowlistMarkers.some((marker) =>
    lowerLine.includes(marker.toLowerCase()),
  );
};

const getLineNumber = (text, index) => text.slice(0, index).split("\n").length;

const getLineAt = (text, index) => {
  const naturalLineStart = text.lastIndexOf("\n", index) + 1;
  const naturalLineEnd = text.indexOf("\n", index);
  const lineEnd = naturalLineEnd === -1 ? text.length : naturalLineEnd;

  if (lineEnd - naturalLineStart <= 500) {
    return text.slice(naturalLineStart, lineEnd);
  }

  const snippetStart = Math.max(naturalLineStart, index - 180);
  const snippetEnd = Math.min(lineEnd, index + 320);
  return text.slice(snippetStart, snippetEnd);
};

const redactExcerpt = (line, matchedSecret) => {
  const redactedSecret =
    matchedSecret.length <= 16
      ? "[REDACTED]"
      : `${matchedSecret.slice(0, 8)}…${matchedSecret.slice(-4)}`;
  return line.replace(matchedSecret, redactedSecret).trim().slice(0, 220);
};

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

    if (basename !== "app.asar" && stat.size > maxTextFileBytes) {
      continue;
    }

    if (basename === "image-board-settings.json") {
      findings.push({
        filePath,
        line: 1,
        rule: "local-settings-file",
        excerpt: "image-board-settings.json should never be committed or packaged",
      });
      continue;
    }

    const text = (await fs.readFile(filePath)).toString("utf8");
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(text)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        const overlapsExistingMatch = matchedRanges.some(
          (range) => matchStart < range.end && matchEnd > range.start,
        );
        if (overlapsExistingMatch) {
          continue;
        }

        const line = getLineAt(text, match.index);
        if (shouldAllowLine(line)) {
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
          excerpt: redactExcerpt(line, match[0]),
        });
      }
    }
  }

  return findings;
};

const shouldSkipSourceDirectory = (directoryPath) =>
  skippedDirectoryNames.has(path.basename(directoryPath));

const walkFiles = async (root, options = {}) => {
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
      if (options.skipDirectory?.(entryPath)) {
        continue;
      }
      files.push(...(await walkFiles(entryPath, options)));
      continue;
    }
    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
};

const collectSourceFiles = async () =>
  walkFiles(appRoot, {
    skipDirectory: shouldSkipSourceDirectory,
  });

const collectPackageInputFiles = async () => {
  const roots = [
    path.join(appRoot, "dist"),
    path.join(appRoot, "dist-electron"),
  ];
  const files = [];
  for (const root of roots) {
    files.push(...(await walkFiles(root)));
  }
  return files;
};

const collectReleaseFiles = async () => {
  const appBundle = path.join(
    appRoot,
    "release",
    "mac-arm64",
    "CoreStudio.app",
  );
  const resources = path.join(appBundle, "Contents", "Resources");
  const files = [
    path.join(appBundle, "Contents", "Info.plist"),
    path.join(resources, "app.asar"),
  ];
  files.push(...(await walkFiles(path.join(resources, "app.asar.unpacked"))));
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
