import { describe, expect, it, vi } from "vitest";

import { handleAgentEditCommand } from "./agentCommandEditRuntime";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import type {
  AgentCommandRuntimeDeps,
  AgentCommandSceneSnapshot,
} from "./agentCommandRuntimeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../../shared/providerTypes";

const imageElement = {
  id: "element-1",
  type: "image",
  isDeleted: false,
  fileId: "file-1",
} as ExcalidrawElement;

const otherImageElement = {
  id: "element-2",
  type: "image",
  isDeleted: false,
  fileId: "file-2",
} as ExcalidrawElement;

const createProject = (): DesktopProjectBundle => ({
  projectPath: "/tmp/corestudio-project",
  project: {
    formatVersion: 1,
    appVersion: "test",
    name: "测试项目",
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
  },
  sceneJson: "{}",
  imageRecords: {
    "file-1": {
      fileId: "file-1",
      assetPath: "assets/file-1.png",
      sourceType: "generated",
      generationOrigin: "corestudio",
      prompt: "生成一台 CNC",
      width: 1024,
      height: 1024,
      createdAt: "2026-07-02T00:00:00.000Z",
      mimeType: "image/png",
    },
  },
});

const createScene = (): AgentCommandSceneSnapshot => ({
  elements: [imageElement],
  appState: ({
    selectedElementIds: { "element-1": true },
    selectedGroupIds: {},
  } as unknown) as AppState,
  files: {},
});

const createDeps = (
  patch: Partial<AgentCommandRuntimeDeps> = {},
): AgentCommandRuntimeDeps => ({
  desktopBridge: {} as AgentCommandRuntimeDeps["desktopBridge"],
  getProject: () => createProject(),
  getScene: createScene,
  getExcalidrawAPI: () => null,
  providerSettings: null,
  generationSource: "builtin",
  generateRequest: {
    provider: "zenmux",
    model: "mock-model",
    prompt: "",
    images: 1,
    aspectRatio: "1:1",
    reference: { enabled: false, images: [] },
  } as unknown as GenerationRequest,
  readProjectImageAssets: vi.fn(async () => []),
  insertAssetsIntoScene: vi.fn(async () => undefined),
  flushPendingAutosave: vi.fn(async () => undefined),
  generateImages: vi.fn(async () => undefined),
  ...patch,
});

describe("agentCommandEditRuntime", () => {
  it("locates an image element by file id", async () => {
    const updateScene = vi.fn();
    const scrollToContent = vi.fn();

    const result = await handleAgentEditCommand(
      {
        requestId: "request-1",
        command: "scene.locate",
        payload: {
          projectPath: "/tmp/corestudio-project",
          fileId: "file-1",
        },
      },
      {
        project: createProject(),
        deps: createDeps({
          getExcalidrawAPI: () =>
            ({
              getSceneElementsIncludingDeleted: () => [imageElement],
              updateScene,
              scrollToContent,
            }) as unknown as ReturnType<
              AgentCommandRuntimeDeps["getExcalidrawAPI"]
            >,
        }),
      },
    );

    expect(result).toEqual({
      handled: true,
      value: {
        located: true,
        locateKind: "direct",
        elementIds: ["element-1"],
        fileIds: ["file-1"],
        requestedFileIds: ["file-1"],
      },
    });
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          selectedElementIds: { "element-1": true },
        }),
      }),
    );
    expect(scrollToContent).toHaveBeenCalledWith(
      imageElement,
      expect.objectContaining({ animate: true }),
    );
  });

  it("selects elements by element id or file id", async () => {
    const updateScene = vi.fn();

    const result = await handleAgentEditCommand(
      {
        requestId: "request-1",
        command: "scene.select",
        payload: {
          projectPath: "/tmp/corestudio-project",
          elementIds: ["element-1"],
          fileIds: ["file-2"],
        },
      },
      {
        project: createProject(),
        deps: createDeps({
          getExcalidrawAPI: () =>
            ({
              getSceneElementsIncludingDeleted: () => [
                imageElement,
                otherImageElement,
              ],
              updateScene,
            }) as unknown as ReturnType<
              AgentCommandRuntimeDeps["getExcalidrawAPI"]
            >,
        }),
      },
    );

    expect(result).toEqual({
      handled: true,
      value: {
        selected: true,
        elementIds: ["element-1", "element-2"],
        fileIds: ["file-1", "file-2"],
      },
    });
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          selectedElementIds: {
            "element-1": true,
            "element-2": true,
          },
        }),
      }),
    );
  });

  it("does not handle non-edit commands", async () => {
    await expect(
      handleAgentEditCommand(
        {
          requestId: "request-1",
          command: "desktop.bridge",
          payload: {},
        },
        {
          project: createProject(),
          deps: createDeps(),
        },
      ),
    ).resolves.toEqual({ handled: false });
  });
});
