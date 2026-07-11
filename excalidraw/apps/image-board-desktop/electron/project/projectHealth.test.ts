import { describe, expect, it, vi } from "vitest";

import { inspectProjectHealth } from "./projectHealth";

import type {
  ImageRecord,
  ImageRecordMap,
  ProjectManifest,
} from "../../src/shared/projectTypes";

const createImageRecord = (patch: Partial<ImageRecord> = {}): ImageRecord => ({
  fileId: "file-ok",
  assetPath: "assets/file-ok.png",
  sourceType: "imported",
  width: 1024,
  height: 768,
  createdAt: "2026-07-02T00:00:00.000Z",
  mimeType: "image/png",
  ...patch,
});

const createProjectManifest = (): ProjectManifest =>
  ({
    formatVersion: 1,
    appVersion: "test",
    name: "Health Service",
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

describe("projectHealth", () => {
  it("builds a detailed health report from injected project facts", async () => {
    const imageRecords: ImageRecordMap = {
      "file-ok": createImageRecord({ fileId: "file-ok" }),
      "file-missing-asset": createImageRecord({
        fileId: "file-missing-asset",
        assetPath: "assets/missing.png",
      }),
      "file-generated-orphan": createImageRecord({
        fileId: "file-generated-orphan",
        sourceType: "generated",
        generationOrigin: "acp-agent",
      }),
    };
    const readProjectBundle = vi.fn().mockResolvedValue({
      project: createProjectManifest(),
      imageRecords,
      sceneJson: JSON.stringify({
        elements: [
          {
            id: "image-element-ok",
            type: "image",
            fileId: "file-ok",
          },
          {
            id: "image-element-missing-record",
            type: "image",
            fileId: "file-missing-record",
          },
        ],
      }),
    });
    const collectUnwrittenAcpOutputs = vi.fn().mockResolvedValue([
      {
        fileId: "acp-output",
        taskId: "task-1",
        outputPath: "/tmp/generated/output.png",
        prompt: "生成一张图",
        referenceFileIds: [],
        referenceElementIds: [],
        createdAt: "2026-07-02T00:00:00.000Z",
      },
    ]);

    const report = await inspectProjectHealth(
      {
        projectPath: "/tmp/project",
        agentRunsBaseDir: "/tmp/runs",
      },
      {
        readProjectBundle,
        resolveProjectAssetPath: (_projectPath, assetPath) =>
          `/tmp/project/${assetPath}`,
        listProjectAssetPaths: vi.fn().mockResolvedValue([
          "assets/2026-07-02T00-01-00-000Z_asset-without-record.png",
        ]),
        pathExists: async (targetPath) => !targetPath.endsWith("missing.png"),
        cachedRenditionExists: async ({ rendition }) =>
          rendition === "preview",
        collectUnwrittenAcpOutputs,
      },
    );

    expect(readProjectBundle).toHaveBeenCalledWith("/tmp/project");
    expect(collectUnwrittenAcpOutputs).toHaveBeenCalledWith({
      projectToken: "project-token",
      imageRecords,
      agentRunsBaseDir: "/tmp/runs",
    });
    expect(report.missingImageRecordFileIds).toEqual([
      "file-missing-record",
    ]);
    expect(report.unindexedAssetFileIds).toEqual(["asset-without-record"]);
    expect(report.missingAssetFileIds).toEqual(["file-missing-asset"]);
    expect(report.missingThumbnailFileIds).toEqual([
      "file-ok",
      "file-generated-orphan",
    ]);
    expect(report.orphanGeneratedImageRecordFileIds).toEqual([
      "file-generated-orphan",
    ]);
    expect(report.recordExplanations).toMatchObject({
      "file-ok": {
        code: "board-element",
        status: "ok",
      },
      "file-missing-asset": {
        code: "missing-asset-file",
        status: "manual",
      },
      "file-generated-orphan": {
        code: "missing-board-element",
        status: "repairable",
      },
    });
    expect(report.unwrittenAcpOutputFileIds).toEqual(["acp-output"]);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missing-image-record",
          fileId: "file-missing-record",
          elementId: "image-element-missing-record",
          resolution: expect.objectContaining({ status: "manual" }),
        }),
        expect.objectContaining({
          code: "missing-image-record",
          fileId: "asset-without-record",
          path: "assets/2026-07-02T00-01-00-000Z_asset-without-record.png",
          message:
            "项目资产缺少索引记录：assets/2026-07-02T00-01-00-000Z_asset-without-record.png",
          resolution: expect.objectContaining({ status: "manual" }),
        }),
        expect.objectContaining({
          code: "missing-asset-file",
          fileId: "file-missing-asset",
          resolution: expect.objectContaining({ status: "manual" }),
        }),
        expect.objectContaining({
          code: "missing-thumbnail-cache",
          fileId: "file-ok",
          resolution: expect.objectContaining({ status: "repairable" }),
        }),
        expect.objectContaining({
          code: "orphan-generated-record",
          fileId: "file-generated-orphan",
          resolution: expect.objectContaining({ status: "repairable" }),
        }),
        expect.objectContaining({
          code: "unwritten-acp-output",
          fileId: "acp-output",
          resolution: expect.objectContaining({ status: "repairable" }),
        }),
      ]),
    );
    expect(report.summary.errorCount).toBe(3);
    expect(report.summary.warningCount).toBe(4);
    expect(report.summary.repairableCount).toBe(4);
  });

  it("includes board presence diagnostics for locatable off-board records", async () => {
    const imageRecords: ImageRecordMap = {
      "source-file": createImageRecord({
        fileId: "source-file",
      }),
      "result-file": createImageRecord({
        fileId: "result-file",
        sourceType: "generated",
        generationOrigin: "acp-agent",
        promptReferences: [
          {
            id: "reference-1",
            index: 1,
            label: "参考图 1",
            kind: "image",
            fileIds: ["source-file"],
          },
        ],
      }),
    };

    const report = await inspectProjectHealth(
      {
        projectPath: "/tmp/project",
      },
      {
        readProjectBundle: vi.fn().mockResolvedValue({
          project: createProjectManifest(),
          imageRecords,
          sceneJson: JSON.stringify({
            elements: [
              {
                id: "result-element",
                type: "image",
                fileId: "result-file",
              },
            ],
          }),
        }),
        listProjectAssetPaths: vi.fn().mockResolvedValue([]),
        resolveProjectAssetPath: (_projectPath, assetPath) =>
          `/tmp/project/${assetPath}`,
        pathExists: async () => true,
        cachedRenditionExists: async () => true,
        collectUnwrittenAcpOutputs: vi.fn().mockResolvedValue([]),
      },
    );

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "orphan-image-record",
          fileId: "source-file",
          boardPresence: {
            onBoard: false,
            locatable: true,
            locateKind: "referenced-by-result",
            referencedByFileIds: ["result-file"],
            fallbackFileId: "result-file",
            needsBoardRepair: true,
          },
        }),
      ]),
    );
  });

  it("reports ACP thread outputs when no generation record was written", async () => {
    const report = await inspectProjectHealth(
      {
        projectPath: "/tmp/project",
        agentRunsBaseDir: "/tmp/runs",
      },
      {
        readProjectBundle: vi.fn().mockResolvedValue({
          project: createProjectManifest(),
          imageRecords: {},
          sceneJson: JSON.stringify({ elements: [] }),
        }),
        listProjectAssetPaths: vi.fn().mockResolvedValue([]),
        resolveProjectAssetPath: (_projectPath, assetPath) =>
          `/tmp/project/${assetPath}`,
        pathExists: async () => true,
        cachedRenditionExists: async () => true,
        collectUnwrittenAcpOutputs: vi.fn().mockResolvedValue([
          {
            fileId: "thread-output-file",
            taskId: "task-thread-output",
            threadId: "thread-1",
            outputPath: "/tmp/runs/thread-1/output.png",
            prompt: "继续优化这张图",
            referenceFileIds: [],
            referenceElementIds: [],
            createdAt: "2026-07-02T01:00:00.000Z",
          },
        ]),
      },
    );

    expect(report.unwrittenAcpOutputFileIds).toEqual(["thread-output-file"]);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unwritten-acp-output",
          fileId: "thread-output-file",
          path: "/tmp/runs/thread-1/output.png",
          message: "ACP 生成结果未写入项目：output.png",
          repairable: true,
          resolution: expect.objectContaining({
            status: "repairable",
          }),
        }),
      ]),
    );
  });
});
