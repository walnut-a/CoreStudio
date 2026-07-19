import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockAppDataPath = "";
let mockDocumentsPath = "";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === "appData") {
        return mockAppDataPath;
      }
      if (name === "documents") {
        return mockDocumentsPath;
      }
      return mockAppDataPath;
    }),
  },
}));

import {
  getDefaultProjectsRoot,
  loadRecentProjects,
  rememberRecentProject,
  removeRecentProject,
} from "./recentProjectsStore";
import { PROJECT_FILENAMES } from "../src/shared/projectTypes";

describe("recentProjectsStore", () => {
  const getRecentProjectsFile = () =>
    path.join(
      mockAppDataPath,
      "Excalidraw Image Board",
      "recent-projects.json",
    );

  beforeEach(async () => {
    mockAppDataPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "image-board-app-data-"),
    );
    mockDocumentsPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "image-board-documents-"),
    );
  });

  afterEach(async () => {
    if (mockAppDataPath) {
      await fs.rm(mockAppDataPath, { recursive: true, force: true });
    }
    if (mockDocumentsPath) {
      await fs.rm(mockDocumentsPath, { recursive: true, force: true });
    }
  });

  it("keeps recent projects deduplicated and sorted by latest open time", async () => {
    const projectPath = path.join(mockDocumentsPath, "项目 A");
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, PROJECT_FILENAMES.project),
      "{}",
      "utf8",
    );

    await rememberRecentProject(projectPath, "项目 A", "2026-04-16T01:00:00.000Z");
    await rememberRecentProject(projectPath, "项目 A（重命名）", "2026-04-16T02:00:00.000Z");

    await expect(loadRecentProjects()).resolves.toEqual([
      {
        projectPath,
        name: "项目 A（重命名）",
        lastOpenedAt: "2026-04-16T02:00:00.000Z",
      },
    ]);
  });

  it("keeps up to 20 recent projects for the project list", async () => {
    for (let index = 1; index <= 21; index += 1) {
      const projectPath = path.join(mockDocumentsPath, `项目 ${index}`);
      await fs.mkdir(projectPath, { recursive: true });
      await fs.writeFile(
        path.join(projectPath, PROJECT_FILENAMES.project),
        "{}",
        "utf8",
      );
      await rememberRecentProject(
        projectPath,
        `项目 ${index}`,
        `2026-04-${String(index).padStart(2, "0")}T08:00:00.000Z`,
      );
    }

    const projects = await loadRecentProjects();

    expect(projects).toHaveLength(20);
    expect(projects[0]?.name).toBe("项目 21");
    expect(projects.at(-1)?.name).toBe("项目 2");
  });

  it("drops missing project folders when loading recent projects", async () => {
    const validProjectPath = path.join(mockDocumentsPath, "项目 B");
    await fs.mkdir(validProjectPath, { recursive: true });
    await fs.writeFile(
      path.join(validProjectPath, PROJECT_FILENAMES.project),
      "{}",
      "utf8",
    );

    await rememberRecentProject(
      path.join(mockDocumentsPath, "不存在的项目"),
      "不存在的项目",
      "2026-04-16T01:00:00.000Z",
    );
    await rememberRecentProject(
      validProjectPath,
      "项目 B",
      "2026-04-16T02:00:00.000Z",
    );

    await expect(loadRecentProjects()).resolves.toEqual([
      {
        projectPath: validProjectPath,
        name: "项目 B",
        lastOpenedAt: "2026-04-16T02:00:00.000Z",
      },
    ]);
  });

  it("isolates malformed entries while preserving valid recent projects", async () => {
    const projectPath = path.join(mockDocumentsPath, "项目 D");
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, PROJECT_FILENAMES.project),
      "{}",
      "utf8",
    );
    const recentProjectsFile = getRecentProjectsFile();
    await fs.mkdir(path.dirname(recentProjectsFile), { recursive: true });
    await fs.writeFile(
      recentProjectsFile,
      JSON.stringify([
        null,
        { projectPath: 42, name: "坏记录", lastOpenedAt: "not-a-date" },
        {
          projectPath,
          name: "项目 D",
          lastOpenedAt: "2026-04-16T04:00:00.000Z",
        },
      ]),
      "utf8",
    );

    await expect(loadRecentProjects()).resolves.toEqual([
      {
        projectPath,
        name: "项目 D",
        lastOpenedAt: "2026-04-16T04:00:00.000Z",
      },
    ]);
    await expect(
      fs.readFile(recentProjectsFile, "utf8").then(JSON.parse),
    ).resolves.toEqual([
      {
        projectPath,
        name: "项目 D",
        lastOpenedAt: "2026-04-16T04:00:00.000Z",
      },
    ]);
  });

  it("deduplicates records already present in the recent-projects file", async () => {
    const projectPath = path.join(mockDocumentsPath, "项目 E");
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, PROJECT_FILENAMES.project),
      "{}",
      "utf8",
    );
    const recentProjectsFile = getRecentProjectsFile();
    await fs.mkdir(path.dirname(recentProjectsFile), { recursive: true });
    await fs.writeFile(
      recentProjectsFile,
      JSON.stringify([
        {
          projectPath,
          name: "项目 E（旧）",
          lastOpenedAt: "2026-04-16T03:00:00.000Z",
        },
        {
          projectPath,
          name: "项目 E",
          lastOpenedAt: "2026-04-16T05:00:00.000Z",
        },
      ]),
      "utf8",
    );

    await expect(loadRecentProjects()).resolves.toEqual([
      {
        projectPath,
        name: "项目 E",
        lastOpenedAt: "2026-04-16T05:00:00.000Z",
      },
    ]);
  });

  it("starts with an empty list but preserves a wholly corrupted recent-projects file", async () => {
    const recentProjectsFile = getRecentProjectsFile();
    await fs.mkdir(path.dirname(recentProjectsFile), { recursive: true });
    await fs.writeFile(recentProjectsFile, "{broken", "utf8");

    await expect(loadRecentProjects()).resolves.toEqual([]);
    await expect(fs.readFile(recentProjectsFile, "utf8")).resolves.toBe(
      "{broken",
    );
  });

  it("removes only the project list record and keeps the local project folder", async () => {
    const projectPath = path.join(mockDocumentsPath, "项目 C");
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, PROJECT_FILENAMES.project),
      "{}",
      "utf8",
    );

    await rememberRecentProject(projectPath, "项目 C", "2026-04-16T03:00:00.000Z");

    await expect(removeRecentProject(projectPath)).resolves.toEqual([]);
    await expect(fs.access(projectPath)).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(projectPath, PROJECT_FILENAMES.project)),
    ).resolves.toBeUndefined();
  });

  it("uses the user documents folder as the default projects root", () => {
    expect(getDefaultProjectsRoot()).toBe(
      path.join(mockDocumentsPath, "工业设计助手"),
    );
  });
});
