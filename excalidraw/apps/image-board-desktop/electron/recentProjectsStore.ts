import fs from "fs/promises";
import path from "path";

import { app } from "electron";

import { PROJECT_FILENAMES } from "../src/shared/projectTypes";
import type { RecentProjectEntry } from "../src/shared/desktopBridgeTypes";

const SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";
const RECENT_PROJECTS_FILE_NAME = "recent-projects.json";
const DEFAULT_PROJECTS_DIRECTORY_NAME = "工业设计助手";
const MAX_RECENT_PROJECTS = 8;

const getRecentProjectsPath = () =>
  path.join(
    app.getPath("appData"),
    SETTINGS_DIRECTORY_NAME,
    RECENT_PROJECTS_FILE_NAME,
  );

const readRecentProjectsFile = async (): Promise<RecentProjectEntry[]> => {
  try {
    const contents = await fs.readFile(getRecentProjectsPath(), "utf8");
    const parsed = JSON.parse(contents) as RecentProjectEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return [];
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
  const storedEntries = await readRecentProjectsFile();
  const validEntries: RecentProjectEntry[] = [];

  for (const entry of storedEntries) {
    if (await isValidProjectDirectory(entry.projectPath)) {
      validEntries.push(entry);
    }
  }

  validEntries.sort((left, right) =>
    right.lastOpenedAt.localeCompare(left.lastOpenedAt),
  );

  if (validEntries.length !== storedEntries.length) {
    await writeRecentProjectsFile(validEntries);
  }

  return validEntries;
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
