import { describe, expect, it, vi } from "vitest";

import { handleAgentDesktopBridgeRequest } from "./agentDesktopBridgeRequest";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";

const createProject = (): DesktopProjectBundle => ({
  projectPath: "/Users/example/CoreStudio/project",
  project: {
    formatVersion: 1,
    appVersion: "test",
    name: "测试项目",
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      enabled: true,
      token: "project-token",
    },
  },
  sceneJson: "{\"type\":\"excalidraw\"}",
  imageRecords: {},
});

describe("handleAgentDesktopBridgeRequest", () => {
  it("rejects unsupported desktop bridge payloads", async () => {
    await expect(
      handleAgentDesktopBridgeRequest({
        payload: { method: "onAgentCommandRequest" },
        desktopBridge: {},
        getProject: () => null,
        getScene: () => null,
        serializeScene: vi.fn(),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "desktop.bridge method 不受支持。",
    });
  });

  it("rejects non-array args", async () => {
    await expect(
      handleAgentDesktopBridgeRequest({
        payload: { method: "loadRecentProjects", args: "bad" },
        desktopBridge: {},
        getProject: () => null,
        getScene: () => null,
        serializeScene: vi.fn(),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "desktop.bridge args 必须是数组。",
    });
  });

  it("rejects unavailable bridge methods", async () => {
    await expect(
      handleAgentDesktopBridgeRequest({
        payload: { method: "loadRecentProjects" },
        desktopBridge: {},
        getProject: () => null,
        getScene: () => null,
        serializeScene: vi.fn(),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "desktop.bridge method 不可用。",
    });
  });

  it("invokes an allowed desktop bridge method with args", async () => {
    const loadProviderSettings = vi.fn(async () => ({ provider: "ok" }));

    await expect(
      handleAgentDesktopBridgeRequest({
        payload: { method: "loadProviderSettings", args: ["gemini"] },
        desktopBridge: { loadProviderSettings },
        getProject: () => null,
        getScene: () => null,
        serializeScene: vi.fn(),
      }),
    ).resolves.toEqual({ provider: "ok" });
    expect(loadProviderSettings).toHaveBeenCalledWith("gemini");
  });

  it("forwards explicit image writeback transactions", async () => {
    const transaction = {
      transactionId: "transaction-1",
      projectPath: "/Users/example/CoreStudio/project",
      fileIds: ["file-1"],
      imageRecords: {},
    };
    const beginImageWriteback = vi.fn(async () => transaction);
    const input = {
      projectPath: transaction.projectPath,
      files: [],
    };

    await expect(
      handleAgentDesktopBridgeRequest({
        payload: { method: "beginImageWriteback", args: [input] },
        desktopBridge: { beginImageWriteback },
        getProject: () => null,
        getScene: () => null,
        serializeScene: vi.fn(),
      }),
    ).resolves.toEqual(transaction);
    expect(beginImageWriteback).toHaveBeenCalledWith(input);
  });

  it("returns the live current project snapshot for the already-open recent project", async () => {
    const project = createProject();
    const openRecentProject = vi.fn();
    const serializeScene = vi.fn(() => "{\"scene\":\"live\"}");

    await expect(
      handleAgentDesktopBridgeRequest({
        payload: {
          method: "openRecentProject",
          args: [project.projectPath],
        },
        desktopBridge: { openRecentProject },
        getProject: () => project,
        getScene: () => ({
          elements: [{ id: "element-1" } as ExcalidrawElement],
          appState: { zoom: { value: 1 } } as AppState,
          files: {},
        }),
        serializeScene,
      }),
    ).resolves.toEqual({
      ...project,
      sceneJson: "{\"scene\":\"live\"}",
    });
    expect(openRecentProject).not.toHaveBeenCalled();
    expect(serializeScene).toHaveBeenCalledWith({
      elements: [{ id: "element-1" }],
      appState: { zoom: { value: 1 } },
    });
  });
});
