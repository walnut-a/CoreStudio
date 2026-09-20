import { readProjectLocationIdentity } from "./project/projectLocation";
import fs from "fs/promises";
import path from "path";

import { app } from "electron";

import { PROJECT_FILENAMES } from "../src/shared/projectTypes";
import type { RecentProjectEntry } from "../src/shared/desktopBridgeTypes";
import { getDesktopSettingsDirectory } from "./desktopSettingsDirectory";

const RECENT_PROJECTS_FILE_NAME = "recent-projects.json";
const DEFAULT_PROJECTS_DIRECTORY_NAME = "工业设计助手";
const MAX_RECENT_PROJECTS = 20;
let recentProjectsMutationQueue: Promise<void> = Promise.resolve();

const enqueueRecentProjectsOperation = <Result>(
  operation: () => Promise<Result>,
) => {
  const result = recentProjectsMutationQueue.then(operation, operation);
  recentProjectsMutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const getRecentProjectsPath = () =>
  path.join(getDesktopSettingsDirectory(), RECENT_PROJECTS_FILE_NAME);

const isRecentProjectEntry = (value: unknown): value is RecentProjectEntry =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as RecentProjectEntry).projectPath === "string" &&
  (value as RecentProjectEntry).projectPath.trim().length > 0 &&
  typeof (value as RecentProjectEntry).name === "string" &&
  (value as RecentProjectEntry).name.trim().length > 0 &&
  typeof (value as RecentProjectEntry).lastOpenedAt === "string" &&
  Number.isFinite(Date.parse((value as RecentProjectEntry).lastOpenedAt));

const readRecentProjectsFile = async (): Promise<{
  entries: RecentProjectEntry[];
  canRewrite: boolean;
  needsRewrite: boolean;
}> => {
  try {
    const contents = await fs.readFile(getRecentProjectsPath(), "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch {
      return { entries: [], canRewrite: false, needsRewrite: false };
    }
    if (!Array.isArray(parsed)) {
      return { entries: [], canRewrite: false, needsRewrite: false };
    }
    const entries = parsed.filter(isRecentProjectEntry);
    return {
      entries,
      canRewrite: true,
      needsRewrite: entries.length !== parsed.length,
    };
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { entries: [], canRewrite: true, needsRewrite: false };
    }
    throw error;
  }
};

const writeRecentProjectsFile = async (entries: RecentProjectEntry[]) => {
  await fs.mkdir(path.dirname(getRecentProjectsPath()), { recursive: true });
  await fs.writeFile(
    getRecentProjectsPath(),
    JSON.stringify(entries, null, 2),
    "utf8",
  );
};

const areRecentProjectEntriesEqual = (
  left: RecentProjectEntry[],
  right: RecentProjectEntry[],
) =>
  left.length === right.length &&
  left.every((entry, index) => {
    const other = right[index];
    return (
      other &&
      entry.projectPath === other.projectPath &&
      entry.name === other.name &&
      entry.lastOpenedAt === other.lastOpenedAt
    );
  });

const isValidProjectDirectory = async (projectPath: string) => {
  try {
    await fs.access(path.join(projectPath, PROJECT_FILENAMES.project));
    return true;
  } catch {
    return false;
  }
};

const resolveEntryPath = async (entry: RecentProjectEntry) => {
  if (!entry.projectId) return entry.projectPath;
  let stat;
  try {
    stat = await fs.lstat(entry.projectPath);
  } catch (cause) {
    throw new Error(
      "无法访问原项目文件夹，请点击“打开项目”重新定位。",
      { cause },
    );
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("原项目位置不是文件夹，请点击“打开项目”重新定位。");
  }
  let actual;
  try {
    actual = await readProjectLocationIdentity(entry.projectPath);
  } catch (cause) {
    throw new Error(
      "项目文件暂时无法读取，请稍后重试。",
      { cause },
    );
  }
  // Historical device numbers are not durable, and a nearby same-ID copy is
  // not proof of a rename. Only live rooms have identity evidence to follow one.
  if (actual.projectId !== entry.projectId) {
    throw new Error("原位置的项目已发生变化，请点击“打开项目”重新定位。");
  }
  return entry.projectPath;
};

// Resolve again at click time: the folder may have changed since the list was shown.
export const resolveRecentProjectPath = (projectPath: string) =>
  enqueueRecentProjectsOperation(async () => {
    const { entries } = await readRecentProjectsFile();
    const entry = entries.find((entry) => entry.projectPath === projectPath);
    return entry ? resolveEntryPath(entry) : projectPath;
  });

export const getDefaultProjectsRoot = () =>
  path.join(app.getPath("documents"), DEFAULT_PROJECTS_DIRECTORY_NAME);

export const ensureDefaultProjectsRoot = async () => {
  const defaultProjectsRoot = getDefaultProjectsRoot();
  await fs.mkdir(defaultProjectsRoot, { recursive: true });
  return defaultProjectsRoot;
};

const loadRecentProjectsUnsafe = async () => {
  const {
    entries: storedEntries,
    canRewrite,
    needsRewrite,
  } = await readRecentProjectsFile();
  const validEntries: RecentProjectEntry[] = [];

  for (const entry of storedEntries) {
    if (entry.projectId) {
      try {
        const projectPath = await resolveEntryPath(entry);
        validEntries.push({ ...entry, projectPath });
      } catch {
        validEntries.push(
          entry,
        ); /* Keep a re-location entry instead of forgetting the missing project. */
      }
    } else if (await isValidProjectDirectory(entry.projectPath)) {
      validEntries.push(entry);
    }
  }

  validEntries.sort((left, right) =>
    right.lastOpenedAt.localeCompare(left.lastOpenedAt),
  );

  const seenProjectPaths = new Set<string>();
  const nextEntries = validEntries
    .filter((entry) => {
      if (seenProjectPaths.has(entry.projectPath)) {
        return false;
      }
      seenProjectPaths.add(entry.projectPath);
      return true;
    })
    .slice(0, MAX_RECENT_PROJECTS);

  if (
    canRewrite &&
    (needsRewrite || !areRecentProjectEntriesEqual(nextEntries, storedEntries))
  ) {
    await writeRecentProjectsFile(nextEntries);
  }

  return nextEntries;
};

export const loadRecentProjects = () =>
  enqueueRecentProjectsOperation(loadRecentProjectsUnsafe);

export const rememberRecentProject = async (
  projectPath: string,
  name: string,
  lastOpenedAt = new Date().toISOString(),
) =>
  enqueueRecentProjectsOperation(async () => {
    const existingEntries = await loadRecentProjectsUnsafe();
    let identity: { projectId?: string } = {};
    let canonicalProjectPath: string | undefined;
    try {
      const { projectId } = await readProjectLocationIdentity(projectPath);
      canonicalProjectPath = await fs.realpath(projectPath);
      identity = { projectId };
    } catch {
      /* Older projects can be remembered by path. */
    }
    const retainedEntries: RecentProjectEntry[] = [];
    for (const entry of existingEntries) {
      if (entry.projectPath === projectPath) continue;
      if (canonicalProjectPath && entry.projectId === identity.projectId) {
        try {
          if ((await fs.realpath(entry.projectPath)) === canonicalProjectPath)
            continue;
        } catch {
          // Keep unavailable entries for explicit relocation.
        }
      }
      retainedEntries.push(entry);
    }
    const nextEntries = [
      {
        ...identity,
        projectPath,
        name,
        lastOpenedAt,
      },
      ...retainedEntries,
    ].slice(0, MAX_RECENT_PROJECTS);

    await writeRecentProjectsFile(nextEntries);
    return nextEntries;
  });

export const removeRecentProject = (projectPath: string) =>
  enqueueRecentProjectsOperation(async () => {
    const existingEntries = await loadRecentProjectsUnsafe();
    const nextEntries = existingEntries.filter(
      (entry) => entry.projectPath !== projectPath,
    );
    await writeRecentProjectsFile(nextEntries);
    return nextEntries;
  });
