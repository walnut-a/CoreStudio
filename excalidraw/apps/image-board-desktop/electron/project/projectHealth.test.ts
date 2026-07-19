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
});
