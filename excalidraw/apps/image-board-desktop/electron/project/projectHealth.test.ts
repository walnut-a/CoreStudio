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
});
