import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { PROJECT_FILENAMES } from "../src/shared/projectTypes";

import {
  createProjectStructure,
  persistImageAssets,
  readProjectAssetPayloads,
  readProjectBundle,
  rebuildProjectThumbnails,
  writeProjectScene,
} from "./projectFs";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("projectFs", () => {
  it("creates the expected project folder structure", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "My Prompt Board");

    await expect(
      fs.stat(path.join(project.projectPath, "assets")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(project.projectPath, "exports")),
    ).resolves.toBeTruthy();

    const bundle = await readProjectBundle(project.projectPath);
    expect(bundle.project.name).toBe("My Prompt Board");
    expect(bundle.imageRecords).toEqual({});
  });

  it("rejects creating a project over an existing non-empty folder", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const projectPath = path.join(root, "Existing Project");
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, "scene.excalidraw.json"),
      "keep-me",
      "utf8",
    );

    await expect(
      createProjectStructure(root, "Existing Project"),
    ).rejects.toThrow("目标项目文件夹已经存在");

    await expect(
      fs.readFile(path.join(projectPath, "scene.excalidraw.json"), "utf8"),
    ).resolves.toBe("keep-me");
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
          promptReferences: [
            {
              id: "reference-style",
              index: 1,
              label: "参考图 1",
              kind: "image",
              fileIds: ["source-file"],
              elementIds: ["source-element"],
            },
          ],
          model: "fal-ai/flux/schnell",
          provider: "fal",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });

    expect(records["file-123"].assetPath).toContain("assets/");

    const bundle = await readProjectBundle(project.projectPath);
    expect(bundle.imageRecords["file-123"].prompt).toBe("chair sketch");
    expect(bundle.imageRecords["file-123"].promptReferences).toEqual([
      {
        id: "reference-style",
        index: 1,
        label: "参考图 1",
        kind: "image",
        fileIds: ["source-file"],
        elementIds: ["source-element"],
      },
    ]);
  });

  it("rejects asset records that point outside the project assets folder", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Traversal Test");
    await fs.writeFile(path.join(root, "secret.txt"), "secret", "utf8");
    await fs.writeFile(
      path.join(project.projectPath, "image-records.json"),
      JSON.stringify(
        {
          "file-escape": {
            fileId: "file-escape",
            assetPath: "../secret.txt",
            sourceType: "imported",
            width: 1,
            height: 1,
            createdAt: "2026-04-12T12:00:00.000Z",
            mimeType: "image/png",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await expect(
      readProjectAssetPayloads({
        projectPath: project.projectPath,
        fileIds: ["file-escape"],
      }),
    ).rejects.toThrow("图片资源路径不在项目 assets 文件夹内");
  });

  it("generates and reuses thumbnail payloads when thumbnail rendition is requested", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Thumbnail Cache Test");
    const imageRecords = await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-thumbnail",
          dataBase64: Buffer.from("original-image").toString("base64"),
          mimeType: "image/png",
          width: 1440,
          height: 960,
          sourceType: "imported",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });

    const thumbnailPayloads = await readProjectAssetPayloads(
      {
        projectPath: project.projectPath,
        fileIds: ["file-thumbnail"],
        rendition: "thumbnail",
      },
      {
        createThumbnail: async ({ sourceBuffer, maxDimension }) => {
          expect(sourceBuffer.toString()).toBe("original-image");
          expect(maxDimension).toBe(320);
          return {
            data: Buffer.from("thumbnail-image"),
            mimeType: "image/png",
            width: 320,
            height: 213,
          };
        },
      },
    );

    expect(thumbnailPayloads).toEqual([
      {
        fileId: "file-thumbnail",
        mimeType: "image/png",
        width: 320,
        height: 213,
        createdAt: "2026-04-12T12:00:00.000Z",
        dataBase64: Buffer.from("thumbnail-image").toString("base64"),
        rendition: "thumbnail",
      },
    ]);

    await fs.rm(
      path.join(
        project.projectPath,
        imageRecords["file-thumbnail"]?.assetPath ?? "",
      ),
    );

    const cachedThumbnailPayloads = await readProjectAssetPayloads({
      projectPath: project.projectPath,
      fileIds: ["file-thumbnail"],
      rendition: "thumbnail",
    });
    const cachedThumbnailPayload = cachedThumbnailPayloads[0];

    expect(cachedThumbnailPayload).toBeTruthy();
    expect(cachedThumbnailPayload?.dataBase64).toBe(
      Buffer.from("thumbnail-image").toString("base64"),
    );
    expect(cachedThumbnailPayload?.rendition).toBe("thumbnail");
  });

  it("generates preview payloads separately from small thumbnails", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Preview Cache Test");
    await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-preview",
          dataBase64: Buffer.from("original-preview-image").toString("base64"),
          mimeType: "image/png",
          width: 3000,
          height: 2000,
          sourceType: "imported",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });

    const generatedDimensions: number[] = [];
    await readProjectAssetPayloads(
      {
        projectPath: project.projectPath,
        fileIds: ["file-preview"],
        rendition: "thumbnail",
      },
      {
        createThumbnail: async ({ maxDimension }) => {
          generatedDimensions.push(maxDimension);
          return {
            data: Buffer.from("small-thumbnail-image"),
            mimeType: "image/png",
            width: 320,
            height: 213,
          };
        },
      },
    );

    const previewPayloads = await readProjectAssetPayloads(
      {
        projectPath: project.projectPath,
        fileIds: ["file-preview"],
        rendition: "preview",
      },
      {
        createThumbnail: async ({ maxDimension }) => {
          generatedDimensions.push(maxDimension);
          return {
            data: Buffer.from("preview-image"),
            mimeType: "image/png",
            width: 1280,
            height: 853,
          };
        },
      },
    );

    expect(generatedDimensions).toEqual([320, 1280]);
    expect(previewPayloads).toEqual([
      {
        fileId: "file-preview",
        mimeType: "image/png",
        width: 1280,
        height: 853,
        createdAt: "2026-04-12T12:00:00.000Z",
        dataBase64: Buffer.from("preview-image").toString("base64"),
        rendition: "preview",
      },
    ]);
  });

  it("returns a placeholder without reading source assets when thumbnail cache is missing in cache-only mode", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(
      root,
      "Missing Thumbnail Placeholder Test",
    );
    const imageRecords = await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-missing-thumbnail",
          dataBase64: Buffer.from("original-image").toString("base64"),
          mimeType: "image/png",
          width: 1440,
          height: 960,
          sourceType: "imported",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });
    await fs.rm(
      path.join(
        project.projectPath,
        imageRecords["file-missing-thumbnail"]?.assetPath ?? "",
      ),
    );
    const createThumbnail = vi.fn();

    const payloads = await readProjectAssetPayloads(
      {
        projectPath: project.projectPath,
        fileIds: ["file-missing-thumbnail"],
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      },
      { createThumbnail },
    );

    expect(createThumbnail).not.toHaveBeenCalled();
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        fileId: "file-missing-thumbnail",
        mimeType: "image/svg+xml",
        width: 320,
        height: 213,
        createdAt: "2026-04-12T12:00:00.000Z",
        rendition: "placeholder",
      }),
    );
    expect(payloads[0]?.dataBase64).toEqual(expect.any(String));
    expect(
      Buffer.from(payloads[0]?.dataBase64 ?? "", "base64").toString("utf8"),
    ).not.toContain("缩略图生成中");
  });

  it("rebuilds missing thumbnails without failing the batch when some source assets are unavailable", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(
      root,
      "Thumbnail Rebuild Test",
    );
    const imageRecords = await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-ok",
          dataBase64: Buffer.from("original-image").toString("base64"),
          mimeType: "image/png",
          width: 1440,
          height: 960,
          sourceType: "imported",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });
    await fs.writeFile(
      path.join(project.projectPath, PROJECT_FILENAMES.imageRecords),
      JSON.stringify(
        {
          ...imageRecords,
          "file-missing": {
            fileId: "file-missing",
            assetPath: "assets/missing.png",
            sourceType: "imported",
            width: 1440,
            height: 960,
            createdAt: "2026-04-12T12:00:00.000Z",
            mimeType: "image/png",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await rebuildProjectThumbnails(
      {
        projectPath: project.projectPath,
        fileIds: ["file-ok", "file-missing"],
      },
      {
        createThumbnail: async ({ sourceBuffer }) => {
          expect(sourceBuffer.toString()).toBe("original-image");
          return {
            data: Buffer.from("thumbnail-image"),
            mimeType: "image/png",
            width: 768,
            height: 512,
          };
        },
      },
    );

    expect(result).toEqual({
      generatedFileIds: ["file-ok"],
      skippedFileIds: [],
      failedFileIds: ["file-missing"],
    });

    await expect(
      readProjectAssetPayloads({
        projectPath: project.projectPath,
        fileIds: ["file-ok"],
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        fileId: "file-ok",
        dataBase64: Buffer.from("thumbnail-image").toString("base64"),
        rendition: "thumbnail",
      }),
    ]);
  });

  it("force rebuilds thumbnail cache even when a cached thumbnail already exists", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Force Rebuild Test");
    await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-force",
          dataBase64: Buffer.from("original-image").toString("base64"),
          mimeType: "image/png",
          width: 1440,
          height: 960,
          sourceType: "imported",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });

    await readProjectAssetPayloads(
      {
        projectPath: project.projectPath,
        fileIds: ["file-force"],
        rendition: "thumbnail",
      },
      {
        createThumbnail: async () => ({
          data: Buffer.from("old-thumbnail"),
          mimeType: "image/png",
          width: 320,
          height: 213,
        }),
      },
    );

    await expect(
      rebuildProjectThumbnails(
        {
          projectPath: project.projectPath,
          fileIds: ["file-force"],
          force: true,
        },
        {
          createThumbnail: async () => ({
            data: Buffer.from("new-thumbnail"),
            mimeType: "image/png",
            width: 320,
            height: 213,
          }),
        },
      ),
    ).resolves.toEqual({
      generatedFileIds: ["file-force"],
      skippedFileIds: [],
      failedFileIds: [],
    });

    await expect(
      readProjectAssetPayloads({
        projectPath: project.projectPath,
        fileIds: ["file-force"],
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        fileId: "file-force",
        dataBase64: Buffer.from("new-thumbnail").toString("base64"),
        rendition: "thumbnail",
      }),
    ]);
  });

  it("reads asset payloads without reading the project scene file", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Asset Payload Test");
    await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-original",
          dataBase64: Buffer.from("original-image").toString("base64"),
          mimeType: "image/png",
          width: 320,
          height: 240,
          sourceType: "imported",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });
    await fs.rm(path.join(project.projectPath, PROJECT_FILENAMES.scene));

    await expect(
      readProjectAssetPayloads({
        projectPath: project.projectPath,
        fileIds: ["file-original"],
        rendition: "original",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        fileId: "file-original",
        dataBase64: Buffer.from("original-image").toString("base64"),
        rendition: "original",
      }),
    ]);
  });

  it("falls back to original assets when thumbnail generation fails", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(
      root,
      "Thumbnail Fallback Test",
    );
    await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-original",
          dataBase64: Buffer.from("original-only").toString("base64"),
          mimeType: "image/png",
          width: 512,
          height: 512,
          sourceType: "imported",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });

    const payloads = await readProjectAssetPayloads(
      {
        projectPath: project.projectPath,
        fileIds: ["file-original"],
        rendition: "thumbnail",
      },
      {
        createThumbnail: async () => {
          throw new Error("无法生成缩略图");
        },
      },
    );

    expect(payloads).toEqual([
      {
        fileId: "file-original",
        mimeType: "image/png",
        width: 512,
        height: 512,
        createdAt: "2026-04-12T12:00:00.000Z",
        dataBase64: Buffer.from("original-only").toString("base64"),
        rendition: "original",
      },
    ]);
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

    const project = await createProjectStructure(
      root,
      "Scene Backup Name Test",
    );
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
