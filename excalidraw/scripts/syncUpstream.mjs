#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";
import { spawnSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.resolve(
  scriptDirectory,
  "..",
  "upstream-baseline.json",
);

const unique = (values) => [...new Set(values)];
const PATCH_DISPOSITIONS = new Set([
  "drop",
  "adopt-upstream",
  "move-to-host",
  "keep-core-patch",
  "keep-support",
]);
const PATCH_PATH_FIELDS = ["corePaths", "contractTests", "supportPaths"];

const isPathInside = (filePath, directoryPath) =>
  filePath === directoryPath || filePath.startsWith(`${directoryPath}/`);

export const parseConflictPaths = (output) => {
  const conflicts = [];

  for (const line of output.split(/\r?\n/)) {
    const appliedMatch = line.match(
      /^Applied patch to '(.+)' with conflicts\.$/,
    );
    if (appliedMatch) {
      conflicts.push(appliedMatch[1]);
      continue;
    }

    const unmergedMatch = line.match(/^(?:U|AA|DD|AU|UA|DU|UD)\s+(.+)$/);
    if (unmergedMatch) {
      conflicts.push(unmergedMatch[1]);
      continue;
    }

    const mergeTreeMatch = line.match(
      /^CONFLICT \(.+\): Merge conflict in (.+)$/,
    );
    if (mergeTreeMatch) {
      conflicts.push(mergeTreeMatch[1]);
    }
  }

  return unique(conflicts);
};

export const validateBaselineConfig = (config) => {
  const requiredStrings = [
    "repository",
    "managedRoot",
    "currentSha",
    "targetSha",
  ];

  for (const key of requiredStrings) {
    if (typeof config[key] !== "string" || config[key].length === 0) {
      throw new Error(`Missing required baseline field: ${key}`);
    }
  }

  for (const key of ["currentSha", "targetSha"]) {
    if (!/^[0-9a-f]{40}$/i.test(config[key])) {
      throw new Error(`Baseline field ${key} must be a full Git SHA`);
    }
  }

  for (const key of ["ownedPaths", "patchGroups"]) {
    if (!Array.isArray(config[key])) {
      throw new Error(`Baseline field ${key} must be an array`);
    }
  }

  const patchGroupIds = new Set();
  for (const patchGroup of config.patchGroups) {
    if (typeof patchGroup.id !== "string" || patchGroup.id.length === 0) {
      throw new Error("Patch groups must have a non-empty id");
    }
    if (patchGroupIds.has(patchGroup.id)) {
      throw new Error(`Duplicate patch group id: ${patchGroup.id}`);
    }
    patchGroupIds.add(patchGroup.id);

    if (!PATCH_DISPOSITIONS.has(patchGroup.disposition)) {
      throw new Error(
        `Unsupported patch disposition for ${patchGroup.id}: ${patchGroup.disposition}`,
      );
    }

    for (const field of ["corePaths", "contractTests"]) {
      if (!Array.isArray(patchGroup[field])) {
        throw new Error(`Patch group ${patchGroup.id} must define ${field}`);
      }
    }
    if (
      patchGroup.supportPaths !== undefined &&
      !Array.isArray(patchGroup.supportPaths)
    ) {
      throw new Error(
        `Patch group ${patchGroup.id} supportPaths must be an array`,
      );
    }
  }

  if (config.sharedPaths !== undefined) {
    if (!Array.isArray(config.sharedPaths)) {
      throw new Error("Baseline field sharedPaths must be an array");
    }
    for (const sharedPath of config.sharedPaths) {
      if (
        typeof sharedPath.path !== "string" ||
        sharedPath.path.length === 0 ||
        !Array.isArray(sharedPath.groups) ||
        sharedPath.groups.length < 2 ||
        typeof sharedPath.reason !== "string" ||
        sharedPath.reason.length === 0
      ) {
        throw new Error(
          "Shared paths must define path, at least two groups, and a reason",
        );
      }
      for (const groupId of sharedPath.groups) {
        if (!patchGroupIds.has(groupId)) {
          throw new Error(
            `Shared path ${sharedPath.path} references unknown group: ${groupId}`,
          );
        }
      }
    }
  }

  return config;
};

export const analyzePatchCoverage = (localPaths, config) => {
  const normalizedLocalPaths = [...new Set(localPaths)].sort();
  const localPathSet = new Set(normalizedLocalPaths);
  const assignments = new Map();

  for (const patchGroup of config.patchGroups) {
    for (const field of PATCH_PATH_FIELDS) {
      for (const filePath of patchGroup[field] ?? []) {
        const groupIds = assignments.get(filePath) ?? new Set();
        groupIds.add(patchGroup.id);
        assignments.set(filePath, groupIds);
      }
    }
  }

  const isOwnedPath = (filePath) =>
    config.ownedPaths.some((ownedPath) => isPathInside(filePath, ownedPath));

  const unregisteredPaths = normalizedLocalPaths.filter(
    (filePath) => !assignments.has(filePath) && !isOwnedPath(filePath),
  );
  const stalePaths = [...assignments.keys()]
    .filter((filePath) => !localPathSet.has(filePath) && !isOwnedPath(filePath))
    .sort();

  const sharedPathReasons = new Map(
    (config.sharedPaths ?? []).map((sharedPath) => [
      sharedPath.path,
      [...new Set(sharedPath.groups)].sort(),
    ]),
  );
  const unexplainedSharedPaths = [...assignments.entries()]
    .map(([filePath, groupIds]) => ({
      path: filePath,
      groups: [...groupIds].sort(),
    }))
    .filter(({ path: filePath, groups }) => {
      if (groups.length < 2 || isOwnedPath(filePath)) {
        return false;
      }
      const documentedGroups = sharedPathReasons.get(filePath);
      return (
        !documentedGroups ||
        documentedGroups.length !== groups.length ||
        documentedGroups.some((groupId, index) => groupId !== groups[index])
      );
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    registeredPathCount: normalizedLocalPaths.length - unregisteredPaths.length,
    unregisteredPaths,
    stalePaths,
    unexplainedSharedPaths,
  };
};

export const isGeneratedJavaScriptArtifact = (filePath, trackedPaths) => {
  if (!filePath.endsWith(".js")) {
    return false;
  }

  const sourcePath = filePath.slice(0, -3);
  return (
    trackedPaths.has(`${sourcePath}.ts`) ||
    trackedPaths.has(`${sourcePath}.tsx`)
  );
};

const runGit = (
  args,
  { cwd, input, allowFailure = false, encoding = "utf8" } = {},
) => {
  const result = spawnSync("git", args, {
    cwd,
    input,
    encoding,
    maxBuffer: 128 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (!allowFailure && result.status !== 0) {
    throw new Error(
      [`git ${args.join(" ")} failed`, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result;
};

const readLines = (value) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const loadBaseline = () =>
  validateBaselineConfig(JSON.parse(fs.readFileSync(baselinePath, "utf8")));

const getRepositoryRoot = () =>
  runGit(["rev-parse", "--show-toplevel"], {
    cwd: scriptDirectory,
  }).stdout.trim();

const assertCommitExists = (repositoryRoot, sha, label) => {
  const result = runGit(["cat-file", "-e", `${sha}^{commit}`], {
    cwd: repositoryRoot,
    allowFailure: true,
  });
  if (result.status !== 0) {
    throw new Error(`${label} commit is not available locally: ${sha}`);
  }
};

const assertOwnedPathsAreNotUpstream = (repositoryRoot, config) => {
  for (const ownedPath of config.ownedPaths) {
    const result = runGit(
      ["cat-file", "-e", `${config.targetSha}:${ownedPath}`],
      {
        cwd: repositoryRoot,
        allowFailure: true,
      },
    );
    if (result.status === 0) {
      throw new Error(
        `Owned path now exists upstream and must be reviewed manually: ${ownedPath}`,
      );
    }
  }
};

const getLocalPatchPaths = (repositoryRoot, config, diffFilter) => {
  const args = [
    "diff",
    "--no-renames",
    "--name-only",
    ...(diffFilter ? [`--diff-filter=${diffFilter}`] : []),
    `${config.currentSha}^{tree}`,
    `HEAD:${config.managedRoot}`,
    "--",
    ".",
    ...config.ownedPaths.map((ownedPath) => `:(exclude)${ownedPath}`),
  ];
  return readLines(runGit(args, { cwd: repositoryRoot }).stdout);
};

export const getWorkingTreePatchPaths = (repositoryRoot, config) => {
  const patchPaths = new Set(getLocalPatchPaths(repositoryRoot, config));
  const statusEntries = runGit(
    [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--no-renames",
      "--",
      config.managedRoot,
    ],
    { cwd: repositoryRoot },
  )
    .stdout.split("\0")
    .filter(Boolean);

  for (const statusEntry of statusEntries) {
    const repositoryPath = statusEntry.slice(3);
    const managedPrefix = `${config.managedRoot}/`;
    if (!repositoryPath.startsWith(managedPrefix)) {
      continue;
    }

    const filePath = repositoryPath.slice(managedPrefix.length);
    if (
      config.ownedPaths.some((ownedPath) => isPathInside(filePath, ownedPath))
    ) {
      continue;
    }

    const upstreamBlob = runGit(
      ["rev-parse", "--verify", `${config.currentSha}:${filePath}`],
      { cwd: repositoryRoot, allowFailure: true },
    );
    const workingPath = path.join(repositoryRoot, repositoryPath);

    if (!fs.existsSync(workingPath)) {
      if (upstreamBlob.status === 0) {
        patchPaths.add(filePath);
      } else {
        patchPaths.delete(filePath);
      }
      continue;
    }

    if (upstreamBlob.status !== 0) {
      patchPaths.add(filePath);
      continue;
    }

    const workingBlob = runGit(["hash-object", workingPath], {
      cwd: repositoryRoot,
    }).stdout.trim();
    if (workingBlob === upstreamBlob.stdout.trim()) {
      patchPaths.delete(filePath);
    } else {
      patchPaths.add(filePath);
    }
  }

  return [...patchPaths].sort();
};

const getUpstreamChangedPaths = (repositoryRoot, config) =>
  readLines(
    runGit(["diff", "--name-only", config.currentSha, config.targetSha], {
      cwd: repositoryRoot,
    }).stdout,
  );

const getTrackedVendorPaths = (repositoryRoot, config) =>
  new Set(
    readLines(
      runGit(["ls-tree", "-r", "--name-only", `HEAD:${config.managedRoot}`], {
        cwd: repositoryRoot,
      }).stdout,
    ),
  );

const createSyntheticVendorCommit = (repositoryRoot, config) =>
  runGit(
    ["commit-tree", `HEAD:${config.managedRoot}`, "-p", config.currentSha],
    {
      cwd: repositoryRoot,
      input: "Synthetic CoreStudio Excalidraw vendor tree\n",
    },
  ).stdout.trim();

const inspectMerge = (repositoryRoot, config) => {
  const syntheticCommit = createSyntheticVendorCommit(repositoryRoot, config);
  const result = runGit(
    [
      "merge-tree",
      "--write-tree",
      "--messages",
      syntheticCommit,
      config.targetSha,
    ],
    { cwd: repositoryRoot, allowFailure: true },
  );
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr || result.stdout || "git merge-tree failed");
  }
  return parseConflictPaths(`${result.stdout}\n${result.stderr}`);
};

const printInspection = (repositoryRoot, config) => {
  const upstreamPaths = getUpstreamChangedPaths(repositoryRoot, config);
  const localPaths = getWorkingTreePatchPaths(repositoryRoot, config);
  const patchCoverage = analyzePatchCoverage(localPaths, config);
  const localSet = new Set(localPaths);
  const overlapPaths = upstreamPaths.filter((filePath) =>
    localSet.has(filePath),
  );
  const conflicts = inspectMerge(repositoryRoot, config);
  const trackedPaths = getTrackedVendorPaths(repositoryRoot, config);
  const generatedArtifacts = getLocalPatchPaths(
    repositoryRoot,
    config,
    "A",
  ).filter((filePath) => isGeneratedJavaScriptArtifact(filePath, trackedPaths));
  const commitCount = runGit(
    ["rev-list", "--count", `${config.currentSha}..${config.targetSha}`],
    { cwd: repositoryRoot },
  ).stdout.trim();

  console.log(`Repository: ${config.repository}`);
  console.log(`Managed root: ${config.managedRoot}`);
  console.log(`Current upstream: ${config.currentSha}`);
  console.log(`Target upstream: ${config.targetSha}`);
  console.log(`Upstream commits: ${commitCount}`);
  console.log(`Upstream changed paths: ${upstreamPaths.length}`);
  console.log(`CoreStudio patch paths: ${localPaths.length}`);
  console.log(
    `Registered patch paths: ${patchCoverage.registeredPathCount}/${localPaths.length}`,
  );
  console.log(`Overlapping paths: ${overlapPaths.length}`);
  console.log(`Predicted conflicts: ${conflicts.length}`);
  console.log(
    `Generated JavaScript artifacts to drop: ${generatedArtifacts.length}`,
  );

  if (conflicts.length > 0) {
    console.log("\nPredicted conflict paths:");
    for (const filePath of conflicts) {
      console.log(`- ${config.managedRoot}/${filePath}`);
    }
  }

  if (patchCoverage.stalePaths.length > 0) {
    console.warn("\nStale registered patch paths:");
    for (const filePath of patchCoverage.stalePaths) {
      console.warn(`- ${filePath}`);
    }
  }

  if (patchCoverage.unregisteredPaths.length > 0) {
    console.error("\nUnregistered CoreStudio patch paths:");
    for (const filePath of patchCoverage.unregisteredPaths) {
      console.error(`- ${filePath}`);
    }
  }

  if (patchCoverage.unexplainedSharedPaths.length > 0) {
    console.error("\nPatch paths shared without an exact sharedPaths entry:");
    for (const {
      path: filePath,
      groups,
    } of patchCoverage.unexplainedSharedPaths) {
      console.error(`- ${filePath}: ${groups.join(", ")}`);
    }
  }

  if (
    patchCoverage.unregisteredPaths.length > 0 ||
    patchCoverage.unexplainedSharedPaths.length > 0
  ) {
    throw new Error("CoreStudio patch coverage validation failed");
  }

  console.log(
    "\nDry-run only. Re-run with --apply to update the working tree.",
  );
};

const assertManagedRootIsClean = (repositoryRoot, config) => {
  const status = runGit(
    ["status", "--porcelain", "--untracked-files=no", "--", config.managedRoot],
    { cwd: repositoryRoot },
  ).stdout.trim();

  if (status) {
    throw new Error(
      `Managed root has tracked changes. Commit or resolve them before applying:\n${status}`,
    );
  }
};

const applyUpstreamPatch = (repositoryRoot, config) => {
  assertManagedRootIsClean(repositoryRoot, config);

  const patch = runGit(
    ["diff", "--binary", "--full-index", config.currentSha, config.targetSha],
    { cwd: repositoryRoot, encoding: null },
  ).stdout;
  const result = runGit(
    ["apply", "--3way", "--quiet", `--directory=${config.managedRoot}`, "-"],
    {
      cwd: repositoryRoot,
      input: patch,
      allowFailure: true,
    },
  );
  const conflicts = readLines(
    runGit(["diff", "--name-only", "--diff-filter=U"], {
      cwd: repositoryRoot,
    }).stdout,
  );

  if (result.status !== 0 && conflicts.length === 0) {
    throw new Error(result.stderr || result.stdout || "git apply failed");
  }

  if (conflicts.length > 0) {
    console.log(`Applied upstream changes with ${conflicts.length} conflicts:`);
    for (const filePath of conflicts) {
      console.log(`- ${filePath}`);
    }
    console.log("Resolve the conflicts before continuing Phase 3.");
    process.exitCode = 1;
    return;
  }

  console.log(`Applied upstream baseline ${config.targetSha} cleanly.`);
};

const main = () => {
  const config = loadBaseline();
  const repositoryRoot = getRepositoryRoot();

  assertCommitExists(repositoryRoot, config.currentSha, "Current upstream");
  assertCommitExists(repositoryRoot, config.targetSha, "Target upstream");
  assertOwnedPathsAreNotUpstream(repositoryRoot, config);

  if (process.argv.includes("--apply")) {
    applyUpstreamPatch(repositoryRoot, config);
    return;
  }

  printInspection(repositoryRoot, config);
};

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
