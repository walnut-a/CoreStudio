import { describe, expect, it, vi } from "vitest";

import { rebuildProjectThumbnails } from "./projectRepair";

import type {
  ImageRecord,
  ImageRecordMap,
  ProjectManifest,
} from "../../src/shared/projectTypes";

const createImageRecord = (patch: Partial<ImageRecord> = {}): ImageRecord => ({
  fileId: "file-ok",
  assetPath: "assets/file-ok.png",
  sourceType: "imported",
  width: 1440,
  height: 960,
  createdAt: "2026-07-02T00:00:00.000Z",
  mimeType: "image/png",
  ...patch,
});

const createProjectManifest = (): ProjectManifest =>
  ({
    formatVersion: 1,
    appVersion: "test",
    name: "Repair Service",
    createdAt: "2026-07-02T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      token: "project-token",
      enabled: true,
    },
  }) as ProjectManifest;

describe("projectRepair", () => {
  it("repairs metadata, imports ACP outputs, and rebuilds thumbnails through injected project IO", async () => {
    const repairedLegacyRecord = createImageRecord({
      fileId: "legacy-generated",
      sourceType: "generated",
      generationOrigin: "corestudio",
    });
    const acpRecord = createImageRecord({
      fileId: "acp-output",
      sourceType: "generated",
      generationOrigin: "acp-agent",
    });
    const imageRecords: ImageRecordMap = {
      "legacy-generated": createImageRecord({
        fileId: "legacy-generated",
        sourceType: "generated",
      }),
      "file-target": createImageRecord({ fileId: "file-target" }),
      "file-small": createImageRecord({
        fileId: "file-small",
        width: 120,
        height: 80,
      }),
    };
    const createThumbnail = vi.fn().mockResolvedValue({
      data: Buffer.from("thumbnail"),
      mimeType: "image/png",
      width: 320,
      height: 213,
    });
    const createCachedRenditionPayload = vi
      .fn()
      .mockResolvedValue({ fileId: "file-target" });
    const deps = {
      createMaintenanceBackup: vi
        .fn()
        .mockResolvedValue("/tmp/project/exports/maintenance-backups/backup"),
      readProjectBundle: vi.fn().mockResolvedValue({
        project: createProjectManifest(),
        sceneJson: JSON.stringify({
          type: "excalidraw",
          elements: [
            { id: "legacy-element", type: "image", fileId: "legacy-generated" },
            { id: "target-element", type: "image", fileId: "file-target" },
            { id: "small-element", type: "image", fileId: "file-small" },
            { id: "acp-element", type: "image", fileId: "acp-output" },
          ],
          appState: {},
          files: {},
        }),
        imageRecords,
      }),
      repairLegacyGeneratedImageRecordOrigins: vi.fn().mockReturnValue({
        imageRecords: {
          ...imageRecords,
          "legacy-generated": repairedLegacyRecord,
        },
        repairedFileIds: ["legacy-generated"],
      }),
      writeProjectImageRecords: vi.fn().mockResolvedValue(undefined),
      touchProjectManifest: vi.fn().mockResolvedValue(undefined),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      collectUnwrittenAcpOutputs: vi.fn().mockResolvedValue([
        {
          fileId: "acp-output",
          taskId: "task-1",
          threadId: "thread-1",
          outputPath: "/tmp/generated/output.png",
          prompt: "生成图片",
          referenceFileIds: [],
          referenceElementIds: [],
          createdAt: "2026-07-02T00:00:00.000Z",
        },
      ]),
      importUnwrittenAcpOutput: vi.fn().mockResolvedValue(acpRecord),
      getCachedRenditionDimensions: vi.fn(
        (record: ImageRecord) =>
          ({
            shouldUseThumbnail: record.fileId !== "file-small",
          }) as { shouldUseThumbnail: boolean },
      ),
      readCachedRenditionPayload: vi.fn().mockResolvedValue(null),
      readFile: vi.fn().mockResolvedValue(Buffer.from("original")),
      resolveProjectAssetPath: vi.fn(
        (_projectPath: string, assetPath: string) => `/tmp/project/${assetPath}`,
      ),
      createCachedRenditionPayload,
      createNativeImageThumbnail: vi.fn(),
    };

    const result = await rebuildProjectThumbnails(
      {
        projectPath: "/tmp/project",
        fileIds: ["file-target", "file-small", "file-missing"],
        createBackup: true,
        agentRunsBaseDir: "/tmp/runs",
      },
      { createThumbnail },
      deps,
    );

    expect(deps.createMaintenanceBackup).toHaveBeenCalledWith({
      projectPath: "/tmp/project",
      reason: "rebuild-project-thumbnails",
    });
    expect(deps.writeProjectImageRecords).toHaveBeenCalledWith(
      "/tmp/project",
      expect.objectContaining({
        "legacy-generated": expect.objectContaining({
          generationOrigin: "corestudio",
        }),
      }),
    );
    expect(deps.touchProjectManifest).toHaveBeenCalled();
    expect(deps.collectUnwrittenAcpOutputs).toHaveBeenCalledWith({
      projectToken: "project-token",
      imageRecords: expect.objectContaining({
        "legacy-generated": expect.objectContaining({
          generationOrigin: "corestudio",
        }),
      }),
      agentRunsBaseDir: "/tmp/runs",
    });
    expect(createCachedRenditionPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: "file-target",
        createThumbnail,
      }),
    );
    expect(result).toEqual({
      generatedFileIds: ["file-target"],
      skippedFileIds: ["file-small"],
      failedFileIds: ["file-missing"],
      skippedDetails: [
        {
          fileId: "file-small",
          reason: "thumbnail-not-needed",
          message: "图片尺寸较小，不需要生成额外显示缓存。",
        },
      ],
      failedDetails: [
        {
          fileId: "file-missing",
          reason: "record-missing",
          message: "项目图片索引记录不存在，无法修复这张图片。",
        },
      ],
      repairedGenerationRecordFileIds: ["legacy-generated"],
      backupPath: "/tmp/project/exports/maintenance-backups/backup",
      repairedAcpOutputFileIds: ["acp-output"],
      repairedAcpOutputRecords: {
        "acp-output": acpRecord,
      },
    });
    expect(deps.writeProjectScene).not.toHaveBeenCalled();
  });

  it("restores readable image records into the project scene during explicit repair", async () => {
    const imageRecords: ImageRecordMap = {
      "file-on-board": createImageRecord({
        fileId: "file-on-board",
        width: 1200,
        height: 800,
      }),
      "file-restored": createImageRecord({
        fileId: "file-restored",
        width: 1600,
        height: 900,
      }),
      "file-missing-asset": createImageRecord({
        fileId: "file-missing-asset",
        assetPath: "assets/file-missing-asset.png",
      }),
      "generated-without-origin": createImageRecord({
        fileId: "generated-without-origin",
        sourceType: "generated",
      }),
    };
    const sceneJson = JSON.stringify({
      type: "excalidraw",
      elements: [
        {
          id: "existing-image",
          type: "image",
          fileId: "file-on-board",
          x: 10,
          y: 20,
          width: 300,
          height: 200,
        },
      ],
      appState: {},
      files: {},
    });
    const writeProjectScene = vi.fn().mockResolvedValue(undefined);
    const deps = {
      createMaintenanceBackup: vi.fn().mockResolvedValue("/tmp/backup"),
      readProjectBundle: vi.fn().mockResolvedValue({
        project: createProjectManifest(),
        sceneJson,
        imageRecords,
      }),
      repairLegacyGeneratedImageRecordOrigins: vi.fn().mockReturnValue({
        imageRecords,
        repairedFileIds: [],
      }),
      writeProjectImageRecords: vi.fn().mockResolvedValue(undefined),
      touchProjectManifest: vi.fn().mockResolvedValue(undefined),
      writeProjectScene,
      collectUnwrittenAcpOutputs: vi.fn().mockResolvedValue([]),
      importUnwrittenAcpOutput: vi.fn(),
      getCachedRenditionDimensions: vi.fn(() => ({
        shouldUseThumbnail: false,
      })),
      readCachedRenditionPayload: vi.fn().mockResolvedValue(null),
      readFile: vi.fn(async (filePath: string) => {
        if (filePath.includes("file-missing-asset")) {
          throw new Error("missing");
        }
        return Buffer.from("original");
      }),
      resolveProjectAssetPath: vi.fn(
        (_projectPath: string, assetPath: string) => `/tmp/project/${assetPath}`,
      ),
      createCachedRenditionPayload: vi.fn(),
      createNativeImageThumbnail: vi.fn(),
    };

    const result = await rebuildProjectThumbnails(
      {
        projectPath: "/tmp/project",
        fileIds: [],
        createBackup: true,
      },
      {},
      deps,
    );

    expect(result.restoredBoardFileIds).toEqual(["file-restored"]);
    expect(result.restoredSceneJson).toEqual(expect.any(String));
    expect(result.failedDetails).toEqual([
      {
        fileId: "file-missing-asset",
        reason: "board-restore-failed",
        message: "原始图片文件不可读取，无法把这张图片补回画板。",
      },
    ]);
    expect(writeProjectScene).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPath: "/tmp/project",
        expectedSceneHash: expect.any(String),
      }),
    );
    const nextScene = JSON.parse(result.restoredSceneJson || "");
    expect(writeProjectScene.mock.calls[0][0].sceneJson).toBe(
      result.restoredSceneJson,
    );
    expect(nextScene.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "image",
          fileId: "file-restored",
          status: "saved",
          width: 320,
          height: 180,
        }),
      ]),
    );
    expect(nextScene.elements).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileId: "generated-without-origin" }),
      ]),
    );
  });
});
