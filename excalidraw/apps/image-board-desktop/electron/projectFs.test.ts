import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createProjectStructure,
  persistImageAssets,
  readProjectBundle,
  writeProjectScene,
} from "./projectFs";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("projectFs", () => {
  it("creates the expected project folder structure", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "My Prompt Board");

    await expect(fs.stat(path.join(project.projectPath, "assets"))).resolves
      .toBeTruthy();
    await expect(fs.stat(path.join(project.projectPath, "exports"))).resolves
      .toBeTruthy();

    const bundle = await readProjectBundle(project.projectPath);
    expect(bundle.project.name).toBe("My Prompt Board");
    expect(bundle.imageRecords).toEqual({});
  });

  it("persists generated assets and records them by file id", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Asset Test");

    const records = await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-123",
          dataBase64: Buffer.from("hello world").toString("base64"),
          mimeType: "image/png",
          width: 512,
          height: 512,
          sourceType: "generated",
          prompt: "chair sketch",
          model: "fal-ai/flux/schnell",
          provider: "fal",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });

    expect(records["file-123"].assetPath).toContain("assets/");

    const bundle = await readProjectBundle(project.projectPath);
    expect(bundle.imageRecords["file-123"].prompt).toBe("chair sketch");
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

  it("uses unique backup names for repeated empty overwrite attempts", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Scene Backup Name Test");
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
    await expect(
      writeProjectScene({
        projectPath: project.projectPath,
        sceneJson: emptyScene,
      }),
    ).rejects.toThrow("检测到非空画板即将被空画板覆盖");

    const backupDir = path.join(
      project.projectPath,
      "exports",
      "scene-backups",
    );
    const backups = await fs.readdir(backupDir);

    expect(new Set(backups).size).toBe(2);
  });

  it("rejects an empty save when the current scene JSON is damaged", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Damaged Scene Test");
    await fs.writeFile(
      path.join(project.projectPath, "scene.excalidraw.json"),
      "{not-json",
      "utf8",
    );

    await expect(
      writeProjectScene({
        projectPath: project.projectPath,
        sceneJson: JSON.stringify({ elements: [], appState: {}, files: {} }),
      }),
    ).rejects.toThrow("当前画板文件无法解析");

    await expect(
      fs.readFile(
        path.join(project.projectPath, "scene.excalidraw.json"),
        "utf8",
      ),
    ).resolves.toBe("{not-json");
  });
});
