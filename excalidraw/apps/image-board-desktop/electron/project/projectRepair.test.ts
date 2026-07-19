import { describe, expect, it, vi } from "vitest";

import { rebuildProjectThumbnails } from "./projectRepair";

describe("projectRepair", () => {
  it("returns an empty repair result for a project without image records", async () => {
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
    const deps = {
      readProjectBundle,
    } as unknown as Parameters<typeof rebuildProjectThumbnails>[2];

    const result = await rebuildProjectThumbnails(
      { projectPath: "/tmp/project", fileIds: [] },
      {},
      deps,
    );

    expect(readProjectBundle).toHaveBeenCalledWith("/tmp/project");
    expect(result.generatedFileIds).toEqual([]);
    expect(result.repairedGenerationRecordFileIds).toEqual([]);
  });
});
