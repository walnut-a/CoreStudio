import fs from "fs/promises";
import os from "os";
import path from "path";
import { createLegacyProjectStructure as createProjectStructure } from "./test/legacyProjectFixture";

import { afterEach, describe, expect, it, vi } from "vitest";

import { PROJECT_FILENAMES } from "../src/shared/projectTypes";
import { getSceneContentHash } from "../src/shared/sceneVersion";

import { readProjectBundle, writeProjectScene } from "./projectFs";

const tempDirectories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("projectFs", () => {
  it("rejects unsupported future project formats without rewriting them", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);
    const created = await createProjectStructure(root, "Future Manifest");
    const projectFile = path.join(
      created.projectPath,
      PROJECT_FILENAMES.project,
    );
    const futureManifest = JSON.stringify({
      ...created.project,
      formatVersion: 99,
    });
    await fs.writeFile(projectFile, futureManifest, "utf8");

    await expect(readProjectBundle(created.projectPath)).rejects.toMatchObject({
      code: "PROJECT_FORMAT_UNSUPPORTED",
    });
    await expect(fs.readFile(projectFile, "utf8")).resolves.toBe(
      futureManifest,
    );
  });

  it("rejects malformed scene JSON before recovery and preserves the source", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);
    const created = await createProjectStructure(root, "Broken Scene");
    const sceneFile = path.join(created.projectPath, PROJECT_FILENAMES.scene);
    const malformedScene = '{"type":"excalidraw","elements":[';
    await fs.writeFile(sceneFile, malformedScene, "utf8");

    await expect(readProjectBundle(created.projectPath)).rejects.toMatchObject({
      code: "PROJECT_SCENE_INVALID",
    });
    await expect(fs.readFile(sceneFile, "utf8")).resolves.toBe(malformedScene);
  });

  it("backs up and rejects a non-empty scene before an empty autosave overwrite", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Scene Backup Test");
    const nonEmptyScene = JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "CoreStudio",
      elements: [
        {
          id: "rect-1",
          type: "rectangle",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ],
      appState: {},
      files: {},
    });
    const emptyScene = JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "CoreStudio",
      elements: [],
      appState: {},
      files: {},
    });

    await writeProjectScene({
      projectPath: project.projectPath,
      sceneJson: nonEmptyScene,
    });
    await expect(
      writeProjectScene({
        projectPath: project.projectPath,
        sceneJson: emptyScene,
      }),
    ).rejects.toThrow("检测到非空画板即将被空画板覆盖");

    const bundle = await readProjectBundle(project.projectPath);
    expect(bundle.sceneJson).toBe(nonEmptyScene);

    const backupDir = path.join(
      project.projectPath,
      "exports",
      "scene-backups",
    );
    const backups = await fs.readdir(backupDir);

    expect(backups).toHaveLength(1);
    await expect(
      fs.readFile(path.join(backupDir, backups[0]), "utf8"),
    ).resolves.toBe(nonEmptyScene);
  });

  it("rejects stale non-empty scene writes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Scene Version Test");
    const baseScene = JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "CoreStudio",
      elements: [
        {
          id: "rect-base",
          type: "rectangle",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ],
      appState: {},
      files: {},
    });
    const nextScene = JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "CoreStudio",
      elements: [
        {
          id: "rect-next",
          type: "rectangle",
          x: 120,
          y: 0,
          width: 100,
          height: 100,
        },
      ],
      appState: {},
      files: {},
    });
    const staleScene = JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "CoreStudio",
      elements: [
        {
          id: "rect-stale",
          type: "rectangle",
          x: 240,
          y: 0,
          width: 100,
          height: 100,
        },
      ],
      appState: {},
      files: {},
    });

    await writeProjectScene({
      projectPath: project.projectPath,
      sceneJson: baseScene,
    });
    const baseHash = getSceneContentHash(baseScene);
    await writeProjectScene({
      projectPath: project.projectPath,
      sceneJson: nextScene,
      expectedSceneHash: baseHash,
    });
    await expect(
      writeProjectScene({
        projectPath: project.projectPath,
        sceneJson: staleScene,
        expectedSceneHash: baseHash,
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_STORAGE_DIVERGED",
      message: expect.stringContaining("磁盘内容与当前项目房间不一致"),
      details: {
        expectedSceneHash: baseHash,
        currentSceneHash: getSceneContentHash(nextScene),
      },
    });

    await expect(
      fs.readFile(
        path.join(project.projectPath, PROJECT_FILENAMES.scene),
        "utf8",
      ),
    ).resolves.toBe(nextScene);
  });
});
