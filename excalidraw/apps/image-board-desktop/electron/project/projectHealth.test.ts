import { describe, expect, it, vi } from "vitest";

import { inspectProjectHealth } from "./projectHealth";

describe("projectHealth", () => {
  it("reports a clean project without consulting removed Agent history", async () => {
    const readProjectBundle = vi.fn(async () => ({
      project: {
        schemaVersion: 1,
        id: "project",
        name: "项目",
        createdAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T00:00:00.000Z",
        agentAccess: { token: "token" },
      },
      sceneJson: JSON.stringify({ elements: [] }),
      imageRecords: {},
    }));

    const report = await inspectProjectHealth(
      { projectPath: "/tmp/project" },
      {
        readProjectBundle: readProjectBundle as unknown as Parameters<
          typeof inspectProjectHealth
        >[1]["readProjectBundle"],
        resolveProjectAssetPath: (_projectPath, assetPath) => assetPath,
        pathExists: async () => true,
        cachedRenditionExists: async () => true,
      },
    );

    expect(readProjectBundle).toHaveBeenCalledWith("/tmp/project");
    expect(report.issues).toEqual([]);
    expect(report.imageRecordCount).toBe(0);
  });

  it("includes image-record parser diagnostics in the project health report", async () => {
    const report = await inspectProjectHealth(
      { projectPath: "/tmp/project" },
      {
        readProjectBundle: async () => ({
          project: {} as never,
          sceneJson: JSON.stringify({ elements: [] }),
          imageRecords: {},
          imageRecordReadIssues: [
            {
              code: "record-key-mismatch",
              fileId: "record-key",
              message: "图片记录键与 fileId 不一致，已隔离该记录。",
              repairable: false,
            },
          ],
        }),
        resolveProjectAssetPath: (_projectPath, assetPath) => assetPath,
        pathExists: async () => true,
        cachedRenditionExists: async () => true,
      },
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "record-key-mismatch",
        fileId: "record-key",
        severity: "error",
        repairable: false,
      }),
    );
    expect(report.summary.errorCount).toBe(1);
  });

  it("includes invalid writeback journals as manual project health issues", async () => {
    const report = await inspectProjectHealth(
      { projectPath: "/tmp/project" },
      {
        readProjectBundle: async () => ({
          project: {} as never,
          sceneJson: JSON.stringify({ type: "excalidraw", elements: [] }),
          imageRecords: {},
          writebackJournalReadIssues: [
            {
              transactionId: "broken-transaction",
              code: "WRITEBACK_JOURNAL_INVALID",
              message: "图片写回事务日志 JSON 已损坏，已保留原文件。",
            },
          ],
        }),
        resolveProjectAssetPath: (_projectPath, assetPath) => assetPath,
        pathExists: async () => true,
        cachedRenditionExists: async () => true,
      },
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "invalid-writeback-journal",
        severity: "error",
        repairable: false,
        message: expect.stringContaining("broken-transaction"),
      }),
    );
  });

  it("reports soft-deleted board images as intentional removals", async () => {
    const report = await inspectProjectHealth(
      { projectPath: "/tmp/project" },
      {
        readProjectBundle: async () => ({
          project: {} as never,
          sceneJson: JSON.stringify({
            type: "excalidraw",
            elements: [
              {
                id: "deleted-element",
                type: "image",
                fileId: "removed-file",
                isDeleted: true,
              },
            ],
          }),
          imageRecords: {
            "removed-file": {
              fileId: "removed-file",
              assetPath: "assets/removed-file.png",
              sourceType: "imported",
              width: 1024,
              height: 1024,
              createdAt: "2026-07-23T00:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
        resolveProjectAssetPath: (_projectPath, assetPath) => assetPath,
        pathExists: async () => true,
        cachedRenditionExists: async () => true,
      },
    );

    expect(report.orphanImageRecordFileIds).toEqual([]);
    expect(report.orphanGeneratedImageRecordFileIds).toEqual([]);
    expect(report.recordExplanations?.["removed-file"]).toMatchObject({
      code: "removed-from-board",
      status: "ok",
    });
    expect(report.issues).toEqual([]);
  });
});
