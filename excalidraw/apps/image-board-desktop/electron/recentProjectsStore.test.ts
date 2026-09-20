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
  resolveRecentProjectPath,
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

  it("keeps a renamed recent project for explicit relocation without guessing a new path", async () => {
    const old = path.join(mockDocumentsPath, "Old"),
      next = path.join(mockDocumentsPath, "New");
    await fs.mkdir(old);
    await fs.writeFile(
      path.join(old, "project.json"),
      JSON.stringify({ projectId: "stable-project" }),
    );
    await rememberRecentProject(old, "Display name");
    await fs.rename(old, next);
    const entries = await loadRecentProjects();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      projectPath: old,
      name: "Display name",
      projectId: "stable-project",
    });
  });

  it("rejects a different project reusing the old path even when the original is nearby", async () => {
    const old = path.join(mockDocumentsPath, "Old");
    const next = path.join(mockDocumentsPath, "New");
    await fs.mkdir(old);
    await fs.writeFile(
      path.join(old, "project.json"),
      JSON.stringify({ projectId: "original" }),
    );
    await rememberRecentProject(old, "Original");
    await fs.rename(old, next);
    await fs.mkdir(old);
    await fs.writeFile(
      path.join(old, "project.json"),
      JSON.stringify({ projectId: "replacement" }),
    );
    await expect(resolveRecentProjectPath(old)).rejects.toThrow(/重新定位/);
    expect((await loadRecentProjects())[0].projectPath).toBe(old);
  });

  const rememberWithPreviousDevice = async (projectPath: string) => {
    await fs.mkdir(projectPath);
    await fs.writeFile(
      path.join(projectPath, "project.json"),
      JSON.stringify({ projectId: "stable-project" }),
    );
    const stat = await fs.lstat(projectPath, { bigint: true });
    const recentProjectsFile = getRecentProjectsFile();
    await fs.mkdir(path.dirname(recentProjectsFile), { recursive: true });
    await fs.writeFile(
      recentProjectsFile,
      JSON.stringify([
        {
          projectPath,
          projectId: "stable-project",
          directoryId: `${stat.dev + 1n}:${stat.ino}`,
          name: "Saved project",
          lastOpenedAt: "2026-09-20T01:00:00.000Z",
        },
      ]),
    );
  };

  it("opens the saved path after the volume device number changes", async () => {
    const projectPath = path.join(mockDocumentsPath, "Project");
    await rememberWithPreviousDevice(projectPath);
    // A copy elsewhere must not make the explicit, still-valid path ambiguous.
    const copy = path.join(mockDocumentsPath, "Copy");
    await fs.mkdir(copy);
    await fs.copyFile(
      path.join(projectPath, "project.json"),
      path.join(copy, "project.json"),
    );
    expect(await resolveRecentProjectPath(projectPath)).toBe(projectPath);
  });

  it("requires explicit relocation after an offline rename regardless of old device numbers", async () => {
    const old = path.join(mockDocumentsPath, "Old");
    const next = path.join(mockDocumentsPath, "New");
    await rememberWithPreviousDevice(old);
    await fs.rename(old, next);
    // The original path may have been reused by a different project.
    await fs.mkdir(old);
    await fs.writeFile(
      path.join(old, "project.json"),
      JSON.stringify({ projectId: "replacement" }),
    );
    await expect(resolveRecentProjectPath(old)).rejects.toThrow(/重新定位/);
    expect((await loadRecentProjects())[0].projectPath).toBe(old);
  });

  it("still rejects ambiguous copies or a different project after a device change", async () => {
    const old = path.join(mockDocumentsPath, "Old");
    const next = path.join(mockDocumentsPath, "New");
    const copy = path.join(mockDocumentsPath, "Copy");
    await rememberWithPreviousDevice(old);
    await fs.rename(old, next);
    await fs.mkdir(copy);
    await fs.copyFile(
      path.join(next, "project.json"),
      path.join(copy, "project.json"),
    );
    await expect(resolveRecentProjectPath(old)).rejects.toThrow(/重新定位/);
    await fs.rm(next, { recursive: true });
    await fs.rm(copy, { recursive: true });
    await fs.mkdir(old);
    await fs.writeFile(
      path.join(old, "project.json"),
      JSON.stringify({ projectId: "replacement" }),
    );
    await expect(resolveRecentProjectPath(old)).rejects.toThrow(/重新定位/);
  });

  it.each(["{incomplete", null, JSON.stringify({ name: "identity missing" })])(
    "keeps the original path when its manifest is unreadable (%s), even with a readable backup",
    async (content) => {
      const original = path.join(mockDocumentsPath, "Original");
      const backup = path.join(mockDocumentsPath, "Backup");
      await rememberWithPreviousDevice(original);
      await fs.mkdir(backup);
      await fs.copyFile(
        path.join(original, "project.json"),
        path.join(backup, "project.json"),
      );
      const manifest = path.join(original, "project.json");
      const valid = await fs.readFile(manifest, "utf8");
      if (content === null) await fs.unlink(manifest);
      else await fs.writeFile(manifest, content);
      await expect(resolveRecentProjectPath(original)).rejects.toThrow(
        /项目文件暂时无法读取/,
      );
      expect((await loadRecentProjects())[0].projectPath).toBe(original);
      expect((await fs.stat(original)).isDirectory()).toBe(true);
      if (content === null)
        await expect(fs.stat(manifest)).rejects.toMatchObject({
          code: "ENOENT",
        });
      else expect(await fs.readFile(manifest, "utf8")).toBe(content);
      await fs.writeFile(manifest, valid);
      expect(await resolveRecentProjectPath(original)).toBe(original);
    },
  );

  it("does not mistake a remaining backup for the original moved outside its parent", async () => {
    const original = path.join(mockDocumentsPath, "Original");
    const backup = path.join(mockDocumentsPath, "Backup");
    const elsewhere = path.join(mockAppDataPath, "Moved original");
    await rememberWithPreviousDevice(original);
    await fs.mkdir(backup);
    await fs.copyFile(
      path.join(original, "project.json"),
      path.join(backup, "project.json"),
    );
    await fs.rename(original, elsewhere);
    await expect(resolveRecentProjectPath(original)).rejects.toThrow(
      /重新定位/,
    );
    expect((await loadRecentProjects())[0].projectPath).toBe(original);
    await expect(fs.stat(original)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("remembers project IDs without persisting device numbers or merging distinct copies", async () => {
    const original = path.join(mockDocumentsPath, "Original");
    const copy = path.join(mockDocumentsPath, "Copy");
    for (const projectPath of [original, copy]) {
      await fs.mkdir(projectPath);
      await fs.writeFile(
        path.join(projectPath, "project.json"),
        JSON.stringify({ projectId: "same" }),
      );
      await rememberRecentProject(projectPath, path.basename(projectPath));
    }
    const saved = JSON.parse(
      await fs.readFile(getRecentProjectsFile(), "utf8"),
    );
    expect(saved).toHaveLength(2);
    expect(
      saved.map((entry: { projectPath: string }) => entry.projectPath),
    ).toEqual([copy, original]);
    for (const entry of saved) {
      expect(entry.projectId).toBe("same");
      expect(entry).not.toHaveProperty("directoryId");
    }
  });

  it("keeps one recent entry when reopening through an alias of the parent directory", async () => {
    const projectPath = path.join(mockDocumentsPath, "Project");
    await fs.mkdir(projectPath);
    await fs.writeFile(
      path.join(projectPath, "project.json"),
      JSON.stringify({ projectId: "same" }),
    );
    const alias = path.join(mockAppDataPath, "documents-alias");
    await fs.symlink(mockDocumentsPath, alias, "dir");
    await rememberRecentProject(projectPath, "Project");
    await rememberRecentProject(path.join(alias, "Project"), "Project");
    expect(await loadRecentProjects()).toHaveLength(1);
  });

  it("rejects an unresolved saved identity instead of opening its replacement", async () => {
    const old = path.join(mockDocumentsPath, "Old");
    await fs.mkdir(old);
    await fs.writeFile(
      path.join(old, "project.json"),
      JSON.stringify({ projectId: "original" }),
    );
    await rememberRecentProject(old, "Original");
    await fs.writeFile(
      path.join(old, "project.json"),
      JSON.stringify({ projectId: "replacement" }),
    );
    await expect(resolveRecentProjectPath(old)).rejects.toThrow(/重新定位/);
    expect((await loadRecentProjects())[0].projectId).toBe("original");
  });

  it("keeps recent projects deduplicated and sorted by latest open time", async () => {
    const projectPath = path.join(mockDocumentsPath, "项目 A");
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, PROJECT_FILENAMES.project),
      "{}",
      "utf8",
    );

    await rememberRecentProject(
      projectPath,
      "项目 A",
      "2026-04-16T01:00:00.000Z",
    );
    await rememberRecentProject(
      projectPath,
      "项目 A（重命名）",
      "2026-04-16T02:00:00.000Z",
    );

    await expect(loadRecentProjects()).resolves.toEqual([
      {
        projectPath,
        name: "项目 A（重命名）",
        lastOpenedAt: "2026-04-16T02:00:00.000Z",
      },
    ]);
  });

  it("preserves every project when multiple renderers remember projects concurrently", async () => {
    const projectAPath = path.join(mockDocumentsPath, "并发项目 A");
    const projectBPath = path.join(mockDocumentsPath, "并发项目 B");
    for (const projectPath of [projectAPath, projectBPath]) {
      await fs.mkdir(projectPath, { recursive: true });
      await fs.writeFile(
        path.join(projectPath, PROJECT_FILENAMES.project),
        "{}",
        "utf8",
      );
    }

    await Promise.all([
      rememberRecentProject(
        projectAPath,
        "并发项目 A",
        "2026-04-16T01:00:00.000Z",
      ),
      rememberRecentProject(
        projectBPath,
        "并发项目 B",
        "2026-04-16T02:00:00.000Z",
      ),
    ]);

    await expect(loadRecentProjects()).resolves.toEqual([
      {
        projectPath: projectBPath,
        name: "并发项目 B",
        lastOpenedAt: "2026-04-16T02:00:00.000Z",
      },
      {
        projectPath: projectAPath,
        name: "并发项目 A",
        lastOpenedAt: "2026-04-16T01:00:00.000Z",
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

    await rememberRecentProject(
      projectPath,
      "项目 C",
      "2026-04-16T03:00:00.000Z",
    );

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
