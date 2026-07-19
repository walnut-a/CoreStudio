import { describe, expect, it } from "vitest";

import {
  assertPersistedImageAssetIntegrity,
  buildProjectRecordBoardPresenceMap,
  getGeneratedImageRecordMissingFields,
  getPersistedImageAssetIntegrityError,
  getProjectImageRecordBoardRepairFileIds,
  inspectProjectRecordIntegrity,
  isImageGenerationOrigin,
  isImageSourceType,
} from "./projectRecordIntegrity";

import type { ImageRecord, ImageRecordMap } from "./projectTypes";

const createImageRecord = (patch: Partial<ImageRecord> = {}): ImageRecord => ({
  fileId: "file-ok",
  assetPath: "assets/file-ok.png",
  sourceType: "imported",
  width: 1024,
  height: 1024,
  createdAt: "2026-07-02T00:00:00.000Z",
  mimeType: "image/png",
  ...patch,
});

describe("projectRecordIntegrity", () => {
  it("recognizes the canonical image source and generation origin values", () => {
    expect(isImageSourceType("generated")).toBe(true);
    expect(isImageSourceType("imported")).toBe(true);
    expect(isImageSourceType("manual")).toBe(false);

    expect(isImageGenerationOrigin("corestudio")).toBe(true);
    expect(isImageGenerationOrigin("agent-board")).toBe(true);
    expect(isImageGenerationOrigin("retired-agent-runtime")).toBe(false);
    expect(isImageGenerationOrigin("unknown")).toBe(false);
  });

  it("requires generated image records to keep their generation origin", () => {
    expect(
      getGeneratedImageRecordMissingFields({
        sourceType: "generated",
        generationOrigin: "agent-board",
      }),
    ).toEqual([]);

    expect(
      getGeneratedImageRecordMissingFields({
        sourceType: "generated",
      }),
    ).toEqual(["生成来源"]);
  });

  it("allows generated image records to have an empty prompt", () => {
    expect(
      getGeneratedImageRecordMissingFields({
        sourceType: "generated",
        generationOrigin: "corestudio",
      }),
    ).toEqual([]);
  });

  it("validates provenance before persisting image assets", () => {
    expect(
      getPersistedImageAssetIntegrityError({
        sourceType: "generated",
        generationOrigin: "agent-board",
      }),
    ).toBeNull();
    expect(
      getPersistedImageAssetIntegrityError({
        sourceType: "generated",
      }),
    ).toBe("生成图片必须记录生成来源。");
    expect(
      getPersistedImageAssetIntegrityError({
        sourceType: "imported",
        generationOrigin: "manual",
      }),
    ).toBe("图片生成来源格式不正确。");
  });

  it("throws a user-facing error when persisted image provenance is incomplete", () => {
    expect(() =>
      assertPersistedImageAssetIntegrity({
        sourceType: "generated",
      }),
    ).toThrow("生成图片必须记录生成来源。");
  });

  it("builds board presence diagnostics from scene images and prompt references", () => {
    const imageRecords: ImageRecordMap = {
      "source-file": createImageRecord({
        fileId: "source-file",
      }),
      "result-file": createImageRecord({
        fileId: "result-file",
        sourceType: "generated",
        generationOrigin: "agent-board",
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
      "missing-file": createImageRecord({
        fileId: "missing-file",
      }),
    };

    expect(
      buildProjectRecordBoardPresenceMap({
        imageRecords,
        sceneImageFileIds: ["result-file"],
      }),
    ).toMatchObject({
      "source-file": {
        onBoard: false,
        locatable: true,
        locateKind: "referenced-by-result",
        referencedByFileIds: ["result-file"],
        fallbackFileId: "result-file",
        needsBoardRepair: true,
      },
      "result-file": {
        onBoard: true,
        locatable: true,
        locateKind: "direct",
        needsBoardRepair: false,
      },
      "missing-file": {
        onBoard: false,
        locatable: false,
        locateKind: "missing-board-element",
        referencedByFileIds: [],
        fallbackFileId: null,
        needsBoardRepair: true,
      },
    });
  });

  it("returns board repair candidates from the same board presence facts", () => {
    const imageRecords: ImageRecordMap = {
      "direct-file": createImageRecord({
        fileId: "direct-file",
        createdAt: "2026-07-02T00:00:00.000Z",
      }),
      "referenced-source": createImageRecord({
        fileId: "referenced-source",
        createdAt: "2026-07-02T00:01:00.000Z",
      }),
      "generated-valid": createImageRecord({
        fileId: "generated-valid",
        sourceType: "generated",
        generationOrigin: "corestudio",
        createdAt: "2026-07-02T00:02:00.000Z",
      }),
      "generated-missing-origin": createImageRecord({
        fileId: "generated-missing-origin",
        sourceType: "generated",
        createdAt: "2026-07-02T00:03:00.000Z",
      }),
      "missing-asset": createImageRecord({
        fileId: "missing-asset",
        createdAt: "2026-07-02T00:04:00.000Z",
      }),
      "result-file": createImageRecord({
        fileId: "result-file",
        sourceType: "generated",
        generationOrigin: "agent-board",
        createdAt: "2026-07-02T00:05:00.000Z",
        promptReferences: [
          {
            id: "reference-1",
            index: 1,
            label: "参考图 1",
            kind: "image",
            fileIds: ["referenced-source"],
          },
        ],
      }),
    };

    expect(
      getProjectImageRecordBoardRepairFileIds({
        imageRecords,
        sceneImageFileIds: ["direct-file", "result-file"],
        missingAssetFileIds: ["missing-asset"],
      }),
    ).toEqual(["referenced-source", "generated-valid"]);
  });

  it("builds a project record integrity report from record relationships", () => {
    const imageRecords: ImageRecordMap = {
      "file-on-board": createImageRecord({
        fileId: "file-on-board",
      }),
      "file-generated-orphan": createImageRecord({
        fileId: "file-generated-orphan",
        sourceType: "generated",
      }),
      "file-generated-restorable-orphan": createImageRecord({
        fileId: "file-generated-restorable-orphan",
        sourceType: "generated",
        generationOrigin: "corestudio",
      }),
      "file-imported-orphan": createImageRecord({
        fileId: "file-imported-orphan",
      }),
      "file-missing-asset": createImageRecord({
        fileId: "file-missing-asset",
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
      }),
    };

    const report = inspectProjectRecordIntegrity({
      imageRecords,
      sceneImageFileIds: ["file-on-board"],
      missingAssetFileIds: ["file-missing-asset"],
    });

    expect(report.incompleteGenerationRecordFileIds).toEqual([
      "file-generated-orphan",
    ]);
    expect(report.brokenParentFileIds).toEqual(["file-missing-asset"]);
    expect(report.brokenPromptReferenceFileIds).toEqual([
      "file-missing-reference",
    ]);
    expect(report.orphanGeneratedImageRecordFileIds).toEqual([
      "file-generated-orphan",
      "file-generated-restorable-orphan",
    ]);
    expect(report.orphanImageRecordFileIds).toEqual([
      "file-generated-orphan",
      "file-generated-restorable-orphan",
      "file-imported-orphan",
    ]);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "incomplete-generation-record",
          fileId: "file-generated-orphan",
          repairable: true,
        }),
        expect.objectContaining({
          code: "broken-parent-link",
          fileId: "file-missing-asset",
          repairable: false,
        }),
        expect.objectContaining({
          code: "broken-prompt-reference",
          fileId: "file-missing-reference",
          repairable: false,
        }),
        expect.objectContaining({
          code: "orphan-generated-record",
          fileId: "file-generated-restorable-orphan",
          repairable: true,
        }),
        expect.objectContaining({
          code: "orphan-image-record",
          fileId: "file-imported-orphan",
          repairable: true,
        }),
      ]),
    );
    expect(report.orphanImageRecordFileIds).not.toContain(
      "file-missing-asset",
    );
  });

  it("explains off-board records that can still be located through a result image", () => {
    const report = inspectProjectRecordIntegrity({
      imageRecords: {
        "source-file": createImageRecord({
          fileId: "source-file",
        }),
        "result-file": createImageRecord({
          fileId: "result-file",
          sourceType: "generated",
          generationOrigin: "agent-board",
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
      },
      sceneImageFileIds: ["result-file"],
    });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "orphan-image-record",
          fileId: "source-file",
          message:
            "项目图片未直接显示在画板，但可通过后续结果定位：source-file",
          repairable: true,
          boardPresence: {
            onBoard: false,
            locatable: true,
            locateKind: "referenced-by-result",
            referencedByFileIds: ["result-file"],
            fallbackFileId: "result-file",
            needsBoardRepair: true,
          },
          resolution: expect.objectContaining({
            status: "repairable",
            summary:
              "项目数据修复会把这张图片作为独立画板元素补回；当前也可以定位到引用它的结果图。",
          }),
        }),
      ]),
    );
  });

  it("reports generated image records that exist but are missing board elements", () => {
    const report = inspectProjectRecordIntegrity({
      imageRecords: {
        "generated-off-board": createImageRecord({
          fileId: "generated-off-board",
          sourceType: "generated",
          generationOrigin: "corestudio",
        }),
      },
      sceneImageFileIds: [],
    });

    expect(report.orphanGeneratedImageRecordFileIds).toEqual([
      "generated-off-board",
    ]);
    expect(report.orphanImageRecordFileIds).toEqual(["generated-off-board"]);
    expect(report.recordExplanations["generated-off-board"]).toMatchObject({
      code: "missing-board-element",
      status: "repairable",
    });
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "orphan-generated-record",
          fileId: "generated-off-board",
          message: "生成图未显示在画板：generated-off-board",
          repairable: true,
          resolution: expect.objectContaining({
            status: "repairable",
          }),
        }),
      ]),
    );
  });

  it("classifies every project image record by the strongest current explanation", () => {
    const imageRecords: ImageRecordMap = {
      "file-on-board": createImageRecord({
        fileId: "file-on-board",
      }),
      "referenced-source": createImageRecord({
        fileId: "referenced-source",
      }),
      "result-file": createImageRecord({
        fileId: "result-file",
        sourceType: "generated",
        generationOrigin: "agent-board",
        promptReferences: [
          {
            id: "reference-1",
            index: 1,
            label: "参考图 1",
            kind: "image",
            fileIds: ["referenced-source"],
          },
        ],
      }),
      "missing-asset": createImageRecord({
        fileId: "missing-asset",
      }),
      "generated-missing-origin": createImageRecord({
        fileId: "generated-missing-origin",
        sourceType: "generated",
      }),
      "imported-off-board": createImageRecord({
        fileId: "imported-off-board",
      }),
    };

    const report = inspectProjectRecordIntegrity({
      imageRecords,
      sceneImageFileIds: ["file-on-board", "result-file"],
      missingAssetFileIds: ["missing-asset"],
    });

    expect(report.recordExplanations).toMatchObject({
      "file-on-board": {
        code: "board-element",
        status: "ok",
        summary: "图片已经显示在画板上。",
      },
      "referenced-source": {
        code: "referenced-by-result",
        status: "repairable",
        referencedByFileIds: ["result-file"],
        summary:
          "图片未直接显示在画板上，但被画板上的结果图引用；项目数据修复会补回独立画板元素。",
      },
      "missing-asset": {
        code: "missing-asset-file",
        status: "manual",
        summary: "图片原始文件缺失，需要从备份恢复或清理记录。",
      },
      "generated-missing-origin": {
        code: "incomplete-generation-record",
        status: "repairable",
        missingGenerationFields: ["生成来源"],
        summary: "生成记录缺少必要字段；项目数据修复会尝试补齐。",
      },
      "imported-off-board": {
        code: "missing-board-element",
        status: "repairable",
        summary: "图片资产存在但未显示在画板上；项目数据修复会补回画板元素。",
      },
    });
  });
});
