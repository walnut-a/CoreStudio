import { describe, expect, it, vi } from "vitest";

import { createProjectRoomAssetRefreshRendererActions } from "./projectRoomAssetRefreshController";

const record = {
  fileId: "file-new",
  assetPath: "assets/file-new.png",
  sourceType: "generated" as const,
  generationOrigin: "agent-board" as const,
  width: 512,
  height: 512,
  createdAt: "2026-07-24T00:00:00.000Z",
  mimeType: "image/png",
};

describe("projectRoomAssetRefreshController", () => {
  it("merges asset records and schedules the current authoritative scene", () => {
    const scene = {
      elements: [{ id: "image-new", type: "image", fileId: "file-new" }],
      appState: {},
      files: {},
    };
    const project = {
      projectPath: "/tmp/project",
      imageRecords: {},
    };
    const updateProject = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const actions = createProjectRoomAssetRefreshRendererActions({
      getProject: () => project,
      getLatestScene: () => scene,
      updateProject,
      scheduleVisibleImageRenditionLoad,
    });

    actions.applyImageRecords({ "file-new": record });

    expect(updateProject).toHaveBeenCalledWith({
      ...project,
      imageRecords: { "file-new": record },
    });
    expect(scheduleVisibleImageRenditionLoad).toHaveBeenCalledWith(scene);
  });

  it("schedules loading again after an authoritative scene is applied", () => {
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const actions = createProjectRoomAssetRefreshRendererActions({
      getProject: () => null,
      getLatestScene: () => null,
      updateProject: vi.fn(),
      scheduleVisibleImageRenditionLoad,
    });
    const scene = {
      elements: [{ id: "image-new", type: "image", fileId: "file-new" }],
      appState: {},
      files: {},
    };

    actions.applyAuthoritativeScene(scene);

    expect(scheduleVisibleImageRenditionLoad).toHaveBeenCalledWith(scene);
  });

  it("still retries the latest scene when records are already merged", () => {
    const scene = {
      elements: [{ id: "image-new", type: "image", fileId: "file-new" }],
      appState: {},
      files: {},
    };
    const project = {
      projectPath: "/tmp/project",
      imageRecords: { "file-new": record },
    };
    const updateProject = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const actions = createProjectRoomAssetRefreshRendererActions({
      getProject: () => project,
      getLatestScene: () => scene,
      updateProject,
      scheduleVisibleImageRenditionLoad,
    });

    actions.applyImageRecords({ "file-new": record });

    expect(updateProject).not.toHaveBeenCalled();
    expect(scheduleVisibleImageRenditionLoad).toHaveBeenCalledWith(scene);
  });
});
