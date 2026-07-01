import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { PROJECT_FILENAMES } from "../src/shared/projectTypes";
import { getSceneContentHash } from "../src/shared/sceneVersion";

import {
  cleanProjectCache,
  createProjectStructure,
  inspectProjectHealth,
  persistImageAssets,
  readProjectAssetPayloads,
  readProjectBundle,
  rebuildProjectThumbnails,
  updateProjectAgentAccess,
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
    expect(bundle.project.agentAccess).toEqual({
      token: expect.any(String),
      enabled: true,
    });
    expect(bundle.imageRecords).toEqual({});
  });

  it("migrates legacy projects with a stable Agent token", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Legacy Project");
    const projectFile = path.join(project.projectPath, PROJECT_FILENAMES.project);
    const legacyProject = {
      ...project.project,
      agentAccess: undefined,
    };
    delete legacyProject.agentAccess;
    await fs.writeFile(projectFile, JSON.stringify(legacyProject, null, 2));

    const migrated = await readProjectBundle(project.projectPath);
    const persisted = JSON.parse(await fs.readFile(projectFile, "utf8"));

    expect(migrated.project.agentAccess).toEqual({
      token: expect.any(String),
      enabled: true,
    });
    expect(persisted.agentAccess).toEqual(migrated.project.agentAccess);

    const reopened = await readProjectBundle(project.projectPath);
    expect(reopened.project.agentAccess.token).toBe(
      migrated.project.agentAccess.token,
    );
  });

  it("keeps an existing Agent token when opening a project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Existing Token");
    const projectFile = path.join(project.projectPath, PROJECT_FILENAMES.project);
    await fs.writeFile(
      projectFile,
      JSON.stringify(
        {
          ...project.project,
          agentAccess: {
            token: "project-token-1",
            enabled: true,
          },
        },
        null,
        2,
      ),
    );

    const bundle = await readProjectBundle(project.projectPath);

    expect(bundle.project.agentAccess).toEqual({
      token: "project-token-1",
      enabled: true,
    });
  });

  it("keeps project Agent access token stable when the legacy switch is updated", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Agent Switch");
    const token = project.project.agentAccess.token;

    const nextProject = await updateProjectAgentAccess(project.projectPath, {
      token,
      enabled: false,
    });
    const bundle = await readProjectBundle(project.projectPath);

    expect(nextProject.agentAccess).toEqual({
      token,
      enabled: true,
    });
    expect(bundle.project.agentAccess).toEqual({
      token,
      enabled: true,
    });
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
          generationOrigin: "corestudio",
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
    expect(records["file-123"].generationOrigin).toBe("corestudio");

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

  it("rejects generated assets without a generation origin", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Asset Validation Test");

    await expect(
      persistImageAssets({
        projectPath: project.projectPath,
        files: [
          {
            fileId: "file-generated-without-origin",
            dataBase64: Buffer.from("generated-image").toString("base64"),
            mimeType: "image/png",
            width: 512,
            height: 512,
            sourceType: "generated",
            prompt: "",
            createdAt: "2026-04-12T12:00:00.000Z",
          },
        ],
      }),
    ).rejects.toThrow("生成图片必须记录生成来源");
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
      repairedGenerationRecordFileIds: [],
      backupPath: null,
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

  it("repairs legacy generated image origins during explicit project repair", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(
      root,
      "Legacy Generated Repair Test",
    );
    await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "legacy-generated",
          dataBase64: Buffer.from("legacy-generated-image").toString("base64"),
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sourceType: "imported",
          prompt: "旧版本生成图",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });
    const legacyImageRecords = JSON.parse(
      await fs.readFile(
        path.join(project.projectPath, PROJECT_FILENAMES.imageRecords),
        "utf8",
      ),
    );
    await fs.writeFile(
      path.join(project.projectPath, PROJECT_FILENAMES.imageRecords),
      JSON.stringify(
        {
          ...legacyImageRecords,
          "legacy-generated": {
            ...legacyImageRecords["legacy-generated"],
            sourceType: "generated",
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
        fileIds: ["legacy-generated"],
        force: true,
        createBackup: true,
      },
      {
        createThumbnail: async () => ({
          data: Buffer.from("legacy-thumbnail"),
          mimeType: "image/png",
          width: 320,
          height: 320,
        }),
      },
    );

    expect(result.repairedGenerationRecordFileIds).toEqual([
      "legacy-generated",
    ]);
    expect(result.backupPath).toEqual(expect.any(String));
    const imageRecords = JSON.parse(
      await fs.readFile(
        path.join(project.projectPath, PROJECT_FILENAMES.imageRecords),
        "utf8",
      ),
    );
    expect(imageRecords["legacy-generated"].generationOrigin).toBe(
      "corestudio",
    );
  });

  it("repairs legacy generated image origins even when the prompt is empty", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(
      root,
      "Legacy Empty Prompt Generated Repair Test",
    );
    const imageRecords = await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "legacy-generated-empty-prompt",
          dataBase64: Buffer.from("legacy-generated-image").toString("base64"),
          mimeType: "image/png",
          width: 1024,
          height: 1024,
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
          "legacy-generated-empty-prompt": {
            ...imageRecords["legacy-generated-empty-prompt"],
            sourceType: "generated",
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
        fileIds: ["legacy-generated-empty-prompt"],
        force: true,
        createBackup: true,
      },
      {
        createThumbnail: async () => ({
          data: Buffer.from("legacy-thumbnail"),
          mimeType: "image/png",
          width: 320,
          height: 320,
        }),
      },
    );

    expect(result.repairedGenerationRecordFileIds).toEqual([
      "legacy-generated-empty-prompt",
    ]);
    const repairedImageRecords = JSON.parse(
      await fs.readFile(
        path.join(project.projectPath, PROJECT_FILENAMES.imageRecords),
        "utf8",
      ),
    );
    expect(
      repairedImageRecords["legacy-generated-empty-prompt"].generationOrigin,
    ).toBe("corestudio");
    expect(repairedImageRecords["legacy-generated-empty-prompt"].prompt).toBe(
      undefined,
    );
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
      repairedGenerationRecordFileIds: [],
      backupPath: null,
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

  it("creates a metadata backup before manual thumbnail repair", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Maintenance Backup Test");
    await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-backup",
          dataBase64: Buffer.from("original-image").toString("base64"),
          mimeType: "image/png",
          width: 1440,
          height: 960,
          sourceType: "imported",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });

    const result = await rebuildProjectThumbnails(
      {
        projectPath: project.projectPath,
        fileIds: ["file-backup"],
        force: true,
        createBackup: true,
      },
      {
        createThumbnail: async () => ({
          data: Buffer.from("thumbnail-image"),
          mimeType: "image/png",
          width: 320,
          height: 213,
        }),
      },
    );

    expect(result.backupPath).toContain("maintenance-backups");
    await expect(
      fs.readFile(
        path.join(result.backupPath || "", PROJECT_FILENAMES.imageRecords),
        "utf8",
      ),
    ).resolves.toContain("file-backup");
    await expect(
      fs.readFile(
        path.join(result.backupPath || "", "maintenance-backup.json"),
        "utf8",
      ),
    ).resolves.toContain("rebuild-project-thumbnails");
  });

  it("inspects project health without modifying project files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Health Check Test");
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
        {
          fileId: "file-generated-on-board",
          dataBase64: Buffer.from("generated-image").toString("base64"),
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sourceType: "generated",
          generationOrigin: "corestudio",
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "生成一张桌面 CNC 机器",
          createdAt: "2026-04-12T12:01:00.000Z",
        },
        {
          fileId: "file-generated-orphan",
          dataBase64: Buffer.from("orphan-generated-image").toString("base64"),
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sourceType: "imported",
          prompt: "旧生成记录",
          createdAt: "2026-04-12T12:02:00.000Z",
        },
        {
          fileId: "file-generated-restorable-orphan",
          dataBase64: Buffer.from("restorable-orphan-generated-image").toString(
            "base64",
          ),
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sourceType: "generated",
          generationOrigin: "corestudio",
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "恢复一张丢失的生成图",
          createdAt: "2026-04-12T12:03:00.000Z",
        },
        {
          fileId: "file-imported-orphan",
          dataBase64: Buffer.from("orphan-imported-image").toString("base64"),
          mimeType: "image/png",
          width: 960,
          height: 640,
          sourceType: "imported",
          createdAt: "2026-04-12T12:04:00.000Z",
        },
      ],
    });
    await fs.writeFile(
      path.join(project.projectPath, PROJECT_FILENAMES.scene),
      JSON.stringify({
        type: "excalidraw",
        elements: [
          {
            id: "image-1",
            type: "image",
            fileId: "file-ok",
          },
          {
            id: "image-2",
            type: "image",
            fileId: "file-generated-on-board",
          },
          {
            id: "image-3",
            type: "image",
            fileId: "file-missing-record",
          },
        ],
      }),
      "utf8",
    );
    await fs.writeFile(
      path.join(project.projectPath, PROJECT_FILENAMES.imageRecords),
      JSON.stringify(
        {
          ...imageRecords,
          "file-generated-orphan": {
            ...imageRecords["file-generated-orphan"],
            sourceType: "generated",
          },
          "file-missing-asset": {
            fileId: "file-missing-asset",
            assetPath: "assets/missing.png",
            sourceType: "imported",
            width: 1440,
            height: 960,
            createdAt: "2026-04-12T12:00:00.000Z",
            mimeType: "image/png",
            parentFileId: "file-missing-parent",
            promptReferences: [
              {
                id: "reference-missing",
                index: 1,
                label: "参考图 1",
                kind: "image",
                fileIds: ["file-missing-reference"],
              },
            ],
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const report = await inspectProjectHealth({
      projectPath: project.projectPath,
    });

    expect(report.imageRecordCount).toBe(6);
    expect(report.generatedImageRecordCount).toBe(3);
    expect(report.sceneImageFileCount).toBe(3);
    expect(report.missingImageRecordFileIds).toEqual(["file-missing-record"]);
    expect(report.missingAssetFileIds).toEqual(["file-missing-asset"]);
    expect(report.missingThumbnailFileIds).toEqual(
      expect.arrayContaining([
        "file-ok",
        "file-generated-on-board",
        "file-generated-orphan",
        "file-generated-restorable-orphan",
      ]),
    );
    expect(report.orphanGeneratedImageRecordFileIds).toEqual([
      "file-generated-orphan",
      "file-generated-restorable-orphan",
    ]);
    expect(report.orphanImageRecordFileIds).toEqual([
      "file-generated-orphan",
      "file-generated-restorable-orphan",
      "file-imported-orphan",
    ]);
    expect(report.incompleteGenerationRecordFileIds).toEqual([
      "file-generated-orphan",
    ]);
    expect(report.brokenParentFileIds).toEqual(["file-missing-asset"]);
    expect(report.brokenPromptReferenceFileIds).toEqual([
      "file-missing-reference",
    ]);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "orphan-generated-record",
          fileId: "file-generated-orphan",
          repairable: true,
        }),
        expect.objectContaining({
          code: "orphan-generated-record",
          fileId: "file-generated-restorable-orphan",
          repairable: true,
        }),
        expect.objectContaining({
          code: "orphan-image-record",
          fileId: "file-imported-orphan",
          severity: "warning",
          repairable: true,
        }),
        expect.objectContaining({
          code: "incomplete-generation-record",
          fileId: "file-generated-orphan",
          severity: "error",
          repairable: true,
        }),
      ]),
    );
    expect(report.summary.errorCount).toBeGreaterThan(0);
    expect(report.summary.warningCount).toBeGreaterThan(0);
    expect(report.summary.repairableCount).toBe(9);
  });

  it("does not require generated records to have prompts when the origin is present", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Blank Prompt Health");
    await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-generated-without-prompt",
          dataBase64: Buffer.from("generated-image").toString("base64"),
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          sourceType: "generated",
          generationOrigin: "corestudio",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });

    const report = await inspectProjectHealth({
      projectPath: project.projectPath,
    });

    expect(report.incompleteGenerationRecordFileIds).toEqual([]);
    expect(report.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "incomplete-generation-record",
          fileId: "file-generated-without-prompt",
        }),
      ]),
    );
  });

  it("cleans cache files that are no longer tied to project image records", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Cache Cleanup Test");
    await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-keep",
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
        fileIds: ["file-keep"],
        rendition: "thumbnail",
      },
      {
        createThumbnail: async () => ({
          data: Buffer.from("valid-thumbnail"),
          mimeType: "image/png",
          width: 320,
          height: 213,
        }),
      },
    );
    const staleCachePath = path.join(
      project.projectPath,
      PROJECT_FILENAMES.cacheDir,
      "thumbnails",
      "stale-cache.png",
    );
    await fs.mkdir(path.dirname(staleCachePath), { recursive: true });
    await fs.writeFile(staleCachePath, "stale-cache", "utf8");

    const result = await cleanProjectCache({
      projectPath: project.projectPath,
    });

    expect(result.removedFileCount).toBe(1);
    expect(result.removedBytes).toBe(Buffer.byteLength("stale-cache"));
    await expect(fs.stat(staleCachePath)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      readProjectAssetPayloads({
        projectPath: project.projectPath,
        fileIds: ["file-keep"],
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        fileId: "file-keep",
        dataBase64: Buffer.from("valid-thumbnail").toString("base64"),
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

  it("keeps readable image payloads when another requested asset is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(
      root,
      "Partial Asset Payload Test",
    );
    const imageRecords = await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-ok",
          dataBase64: Buffer.from("readable-original").toString("base64"),
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

    await expect(
      readProjectAssetPayloads({
        projectPath: project.projectPath,
        fileIds: ["file-ok", "file-missing"],
        rendition: "original",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        fileId: "file-ok",
        dataBase64: Buffer.from("readable-original").toString("base64"),
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
    ).rejects.toThrow("画板文件已经被其他会话更新");

    await expect(
      fs.readFile(
        path.join(project.projectPath, PROJECT_FILENAMES.scene),
        "utf8",
      ),
    ).resolves.toBe(nextScene);
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
