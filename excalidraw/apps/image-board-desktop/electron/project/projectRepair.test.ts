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

  it("does not restore image elements that were intentionally soft-deleted", async () => {
    const writeProjectScene = vi.fn();
    const imageRecords = {
      "removed-file": {
        fileId: "removed-file",
        assetPath: "assets/removed-file.png",
        sourceType: "imported" as const,
        width: 1024,
        height: 1024,
        createdAt: "2026-07-23T00:00:00.000Z",
        mimeType: "image/png",
      },
    };
    const deps = {
      createMaintenanceBackup: vi.fn(async () => "/tmp/backup"),
      readProjectBundle: vi.fn(async () => ({
        project: {
          schemaVersion: 1,
          id: "project",
          name: "项目",
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
          agentAccess: { token: "token" },
        },
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
        imageRecords,
      })),
      repairLegacyGeneratedImageRecordOrigins: vi.fn(() => ({
        imageRecords,
        repairedFileIds: [],
      })),
      writeProjectScene,
    } as unknown as Parameters<typeof rebuildProjectThumbnails>[2];

    const result = await rebuildProjectThumbnails(
      {
        projectPath: "/tmp/project",
        fileIds: [],
        createBackup: true,
      },
      {},
      deps,
    );

    expect(writeProjectScene).not.toHaveBeenCalled();
    expect(result.restoredBoardFileIds).toBeUndefined();
    expect(result.failedDetails).toBeUndefined();
  });
});
