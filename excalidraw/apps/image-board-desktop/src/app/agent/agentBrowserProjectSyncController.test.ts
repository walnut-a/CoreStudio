import { describe, expect, it, vi } from "vitest";

import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import { runAgentBrowserProjectSyncAction } from "./agentBrowserProjectSyncController";

const createProject = (updatedAt: string): DesktopProjectBundle =>
  ({
    projectPath: "/projects/current",
    project: {
      formatVersion: 1,
      appVersion: "test",
      name: "Current",
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt,
      sceneFile: "scene.excalidraw.json",
      imageRecordsFile: "image-records.json",
      assetsDir: "assets",
      exportsDir: "exports",
      agentAccess: { enabled: true, token: "project-token" },
    },
    sceneJson: "{}",
    imageRecords: {},
  } as DesktopProjectBundle);

describe("runAgentBrowserProjectSyncAction", () => {
  it("reloads and applies the project after the bridge reports a newer version", async () => {
    const currentProject = createProject("2026-07-22T01:00:00.000Z");
    const nextProject = createProject("2026-07-22T01:00:01.000Z");
    nextProject.sceneJson = '{"elements":[{"id":"new-element"}]}';
    const readProjectBundle = vi.fn(async () => nextProject);
    const applyProjectBundle = vi.fn(async () => undefined);
    const applyProjectMetadata = vi.fn();

    await expect(
      runAgentBrowserProjectSyncAction({
        currentProject,
        readProjectVersion: vi.fn(async () => ({
          projectPath: currentProject.projectPath,
          updatedAt: nextProject.project.updatedAt,
        })),
        readProjectBundle,
        applyProjectBundle,
        applyProjectMetadata,
      }),
    ).resolves.toEqual({ status: "applied" });

    expect(readProjectBundle).toHaveBeenCalledWith(currentProject.projectPath);
    expect(applyProjectBundle).toHaveBeenCalledWith(nextProject);
    expect(applyProjectMetadata).not.toHaveBeenCalled();
  });

  it("updates project metadata without resetting the canvas when the scene is unchanged", async () => {
    const currentProject = createProject("2026-07-22T01:00:00.000Z");
    const nextProject = createProject("2026-07-22T01:00:01.000Z");
    nextProject.project.name = "Renamed without a scene change";
    const applyProjectBundle = vi.fn();
    const applyProjectMetadata = vi.fn();

    await expect(
      runAgentBrowserProjectSyncAction({
        currentProject,
        readProjectVersion: vi.fn(async () => ({
          projectPath: currentProject.projectPath,
          updatedAt: nextProject.project.updatedAt,
        })),
        readProjectBundle: vi.fn(async () => nextProject),
        applyProjectBundle,
        applyProjectMetadata,
      }),
    ).resolves.toEqual({ status: "metadata-applied" });

    expect(applyProjectMetadata).toHaveBeenCalledWith(nextProject);
    expect(applyProjectBundle).not.toHaveBeenCalled();
  });

  it("does not reload a project whose version has not changed", async () => {
    const currentProject = createProject("2026-07-22T01:00:00.000Z");
    const readProjectBundle = vi.fn();

    await expect(
      runAgentBrowserProjectSyncAction({
        currentProject,
        readProjectVersion: vi.fn(async () => ({
          projectPath: currentProject.projectPath,
          updatedAt: currentProject.project.updatedAt,
        })),
        readProjectBundle,
        applyProjectBundle: vi.fn(),
        applyProjectMetadata: vi.fn(),
      }),
    ).resolves.toEqual({ status: "unchanged" });

    expect(readProjectBundle).not.toHaveBeenCalled();
  });
});
