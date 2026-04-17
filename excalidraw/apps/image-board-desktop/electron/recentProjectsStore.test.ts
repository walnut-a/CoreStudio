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
} from "./recentProjectsStore";
import { PROJECT_FILENAMES } from "../src/shared/projectTypes";

describe("recentProjectsStore", () => {
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

  it("uses the user documents folder as the default projects root", () => {
    expect(getDefaultProjectsRoot()).toBe(
      path.join(mockDocumentsPath, "工业设计助手"),
    );
  });
});
