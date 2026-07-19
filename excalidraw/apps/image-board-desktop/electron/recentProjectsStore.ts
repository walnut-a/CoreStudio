import fs from "fs/promises";
import path from "path";

import { app } from "electron";

import { PROJECT_FILENAMES } from "../src/shared/projectTypes";
import type { RecentProjectEntry } from "../src/shared/desktopBridgeTypes";

const SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";
const RECENT_PROJECTS_FILE_NAME = "recent-projects.json";
const DEFAULT_PROJECTS_DIRECTORY_NAME = "工业设计助手";
const MAX_RECENT_PROJECTS = 20;

const getRecentProjectsPath = () =>
  path.join(
    app.getPath("appData"),
    SETTINGS_DIRECTORY_NAME,
    RECENT_PROJECTS_FILE_NAME,
  );

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
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
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

export const getDefaultProjectsRoot = () =>
  path.join(app.getPath("documents"), DEFAULT_PROJECTS_DIRECTORY_NAME);

export const ensureDefaultProjectsRoot = async () => {
  const defaultProjectsRoot = getDefaultProjectsRoot();
  await fs.mkdir(defaultProjectsRoot, { recursive: true });
  return defaultProjectsRoot;
};

export const loadRecentProjects = async () => {
  const { entries: storedEntries, canRewrite, needsRewrite } =
    await readRecentProjectsFile();
  const validEntries: RecentProjectEntry[] = [];

  for (const entry of storedEntries) {
    if (await isValidProjectDirectory(entry.projectPath)) {
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
    (needsRewrite ||
      !areRecentProjectEntriesEqual(nextEntries, storedEntries))
  ) {
    await writeRecentProjectsFile(nextEntries);
  }

  return nextEntries;
};

export const rememberRecentProject = async (
  projectPath: string,
  name: string,
  lastOpenedAt = new Date().toISOString(),
) => {
  const existingEntries = await loadRecentProjects();
  const nextEntries = [
    {
      projectPath,
      name,
      lastOpenedAt,
    },
    ...existingEntries.filter((entry) => entry.projectPath !== projectPath),
  ].slice(0, MAX_RECENT_PROJECTS);

  await writeRecentProjectsFile(nextEntries);
  return nextEntries;
};

export const removeRecentProject = async (projectPath: string) => {
  const existingEntries = await loadRecentProjects();
  const nextEntries = existingEntries.filter(
    (entry) => entry.projectPath !== projectPath,
  );
  await writeRecentProjectsFile(nextEntries);
  return nextEntries;
};
