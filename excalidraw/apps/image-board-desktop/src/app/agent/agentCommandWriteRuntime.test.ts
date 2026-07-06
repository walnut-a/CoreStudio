import { describe, expect, it, vi } from "vitest";

import { handleAgentWriteCommand } from "./agentCommandWriteRuntime";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type {
  AgentCommandRuntimeDeps,
  AgentCommandSceneSnapshot,
} from "./agentCommandRuntimeTypes";
import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../../shared/providerTypes";

const imageElement = {
  id: "element-1",
  type: "image",
  isDeleted: false,
  fileId: "file-1",
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
      provider: "zenmux",
      model: "mock-model",
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
  desktopBridge: {
    persistImageAssets: vi.fn(),
  } as unknown as AgentCommandRuntimeDeps["desktopBridge"],
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

describe("agentCommandWriteRuntime", () => {
  it("persists image assets and inserts them into the scene", async () => {
    const persistImageAssets = vi.fn(
      async ({
        files,
      }: {
        projectPath: string;
        files: PersistedImageAssetInput[];
      }) =>
        Object.fromEntries(
          files.map((file) => [
            file.fileId,
            {
              fileId: file.fileId,
              assetPath: `assets/${file.fileId}.png`,
              sourceType: file.sourceType,
              generationOrigin: file.generationOrigin,
              generationTaskId: file.generationTaskId,
              generationThreadId: file.generationThreadId,
              width: file.width,
              height: file.height,
              createdAt: file.createdAt,
              mimeType: file.mimeType,
            },
          ]),
        ),
    );
    const insertAssetsIntoScene = vi.fn(async () => undefined);

    const result = await handleAgentWriteCommand(
      {
        requestId: "request-1",
        command: "scene.addImage",
        payload: {
          projectPath: "/tmp/corestudio-project",
          generationOrigin: "acp-agent",
          generationTaskId: "task-1",
          generationThreadId: "thread-1",
          fileId: "input-file",
          mimeType: "image/png",
          dataBase64: Buffer.from("image").toString("base64"),
          width: 512,
          height: 512,
        },
      },
      {
        project: createProject(),
        deps: createDeps({
          desktopBridge: {
            persistImageAssets,
          } as unknown as AgentCommandRuntimeDeps["desktopBridge"],
          getExcalidrawAPI: () => ({}) as ExcalidrawImperativeAPI,
          insertAssetsIntoScene,
        }),
      },
    );

    expect(result).toMatchObject({
      handled: true,
      value: {
        inserted: true,
        fileIds: [expect.stringMatching(/^agent-/)],
      },
    });
    expect(persistImageAssets).toHaveBeenCalledWith({
      projectPath: "/tmp/corestudio-project",
      files: [
        expect.objectContaining({
          sourceType: "generated",
          generationOrigin: "acp-agent",
          generationTaskId: "task-1",
          generationThreadId: "thread-1",
        }),
      ],
    });
    expect(insertAssetsIntoScene).toHaveBeenCalled();
  });

  it("adds prompt text to the scene and flushes autosave", async () => {
    const updateScene = vi.fn();
    const flushPendingAutosave = vi.fn(async () => undefined);

    const result = await handleAgentWriteCommand(
      {
        requestId: "request-1",
        command: "scene.addPrompt",
        payload: {
          projectPath: "/tmp/corestudio-project",
          text: "做一台更简洁的桌面 CNC",
          anchorPoint: { x: 120, y: 240 },
        },
      },
      {
        project: createProject(),
        deps: createDeps({
          getExcalidrawAPI: () =>
            ({
              getAppState: () => ({
                width: 1200,
                height: 800,
                scrollX: 0,
                scrollY: 0,
                zoom: { value: 1 },
              }),
              getSceneElementsIncludingDeleted: () => [],
              updateScene,
            }) as unknown as ExcalidrawImperativeAPI,
          flushPendingAutosave,
        }),
      },
    );

    expect(result).toMatchObject({
      handled: true,
      value: {
        inserted: true,
        elementIds: [expect.any(String)],
      },
    });
    expect(updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          selectedElementIds: expect.any(Object),
        }),
      }),
    );
    expect(flushPendingAutosave).toHaveBeenCalledWith({ strict: true });
  });

  it("delegates generate requests to the configured generator", async () => {
    const generateImages = vi.fn(async () => undefined);

    const result = await handleAgentWriteCommand(
      {
        requestId: "request-1",
        command: "generate",
        payload: {
          projectPath: "/tmp/corestudio-project",
          prompt: "生成一台更苹果风的 CNC",
        },
      },
      {
        project: createProject(),
        deps: createDeps({ generateImages }),
      },
    );

    expect(result).toEqual({
      handled: true,
      value: { accepted: true },
    });
    expect(generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "生成一台更苹果风的 CNC",
        generationSource: "builtin",
      }),
      false,
      expect.objectContaining({
        expectedProjectPath: "/tmp/corestudio-project",
        referenceScene: null,
        rejectOnError: true,
      }),
    );
  });

  it("does not handle edit commands", async () => {
    await expect(
      handleAgentWriteCommand(
        {
          requestId: "request-1",
          command: "scene.locate",
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
