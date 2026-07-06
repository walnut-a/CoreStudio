import { describe, expect, it, vi } from "vitest";

import { handleAgentCommandRequest } from "./agentCommandRuntime";
import type { AgentCommandRuntimeDeps } from "./agentCommandRuntimeTypes";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type {
  DesktopProjectBundle,
  PersistedImageAssetInput,
} from "../../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../../shared/providerTypes";

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

const imageElement = {
  id: "element-1",
  type: "image",
  isDeleted: false,
  fileId: "file-1",
} as ExcalidrawElement;

const createDeps = (
  patch: Partial<AgentCommandRuntimeDeps> = {},
): AgentCommandRuntimeDeps => {
  const project = createProject();
  return {
    desktopBridge: {
      persistImageAssets: vi.fn(),
    } as unknown as AgentCommandRuntimeDeps["desktopBridge"],
    getProject: () => project,
    getScene: () => ({
      elements: [imageElement],
      appState: ({
        selectedElementIds: {
          "element-1": true,
        },
        selectedGroupIds: {},
      } as unknown) as AppState,
      files: {},
    }),
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
    insertAssetsIntoScene: vi.fn(
      async (_assets: PersistedImageAssetInput[]) => undefined,
    ),
    flushPendingAutosave: vi.fn(async () => undefined),
    generateImages: vi.fn(async () => undefined),
    ...patch,
  };
};

describe("agentCommandRuntime", () => {
  it("accepts task.complete without requiring an opened project", async () => {
    await expect(
      handleAgentCommandRequest(
        {
          requestId: "request-1",
          command: "task.complete",
        },
        createDeps({ getProject: () => null }),
      ),
    ).resolves.toEqual({ completed: true });
  });

  it("returns project image paths from the current scene selection", async () => {
    const result = await handleAgentCommandRequest(
      {
        requestId: "request-1",
        command: "scene.imagePaths",
        payload: {
          selectionOnly: true,
        },
      },
      createDeps(),
    );

    expect(result).toMatchObject({
      projectPath: "/tmp/corestudio-project",
      selectionOnly: true,
      items: [
        {
          fileId: "file-1",
          path: "/tmp/corestudio-project/assets/file-1.png",
          sourceType: "generated",
        },
      ],
      missingFileIds: [],
    });
  });

  it("builds project records with on-board status", async () => {
    const result = await handleAgentCommandRequest(
      {
        requestId: "request-1",
        command: "project.records",
      },
      createDeps(),
    );

    expect(result).toMatchObject({
      summary: {
        recordCount: 1,
        generatedRecordCount: 1,
        onBoardCount: 1,
        offBoardCount: 0,
      },
      records: [
        {
          fileId: "file-1",
          title: "生成一台 CNC",
          onBoard: true,
          boardPresence: {
            onBoard: true,
            locatable: true,
            locateKind: "direct",
            referencedByFileIds: [],
            fallbackFileId: null,
            needsBoardRepair: false,
          },
        },
      ],
    });
  });

  it("builds project records with locate and repair diagnostics", async () => {
    const project = createProject();
    project.imageRecords = {
      "source-file": {
        fileId: "source-file",
        assetPath: "assets/source-file.png",
        sourceType: "imported",
        width: 800,
        height: 800,
        createdAt: "2026-07-02T00:00:00.000Z",
        mimeType: "image/png",
      },
      "result-file": {
        fileId: "result-file",
        assetPath: "assets/result-file.png",
        sourceType: "generated",
        generationOrigin: "acp-agent",
        prompt: "参考源图生成结果",
        width: 1024,
        height: 1024,
        createdAt: "2026-07-02T00:01:00.000Z",
        mimeType: "image/png",
        promptReferences: [
          {
            id: "reference-1",
            index: 1,
            label: "参考图 1",
            kind: "image",
            fileIds: ["source-file"],
          },
        ],
      },
      "missing-file": {
        fileId: "missing-file",
        assetPath: "assets/missing-file.png",
        sourceType: "generated",
        generationOrigin: "corestudio",
        prompt: "缺画板元素",
        width: 1024,
        height: 1024,
        createdAt: "2026-07-02T00:02:00.000Z",
        mimeType: "image/png",
      },
    };
    const resultElement = {
      id: "result-element",
      type: "image",
      isDeleted: false,
      fileId: "result-file",
    } as ExcalidrawElement;

    const result = await handleAgentCommandRequest(
      {
        requestId: "request-1",
        command: "project.records",
      },
      createDeps({
        getProject: () => project,
        getScene: () => ({
          elements: [resultElement],
          appState: ({ selectedElementIds: {}, selectedGroupIds: {} } as unknown) as AppState,
          files: {},
        }),
      }),
    );

    expect(result).toMatchObject({
      summary: {
        recordCount: 3,
        onBoardCount: 1,
        offBoardCount: 2,
      },
    });
    expect((result as { records: unknown[] }).records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileId: "source-file",
          onBoard: false,
          boardPresence: {
            onBoard: false,
            locatable: true,
            locateKind: "referenced-by-result",
            referencedByFileIds: ["result-file"],
            fallbackFileId: "result-file",
            needsBoardRepair: true,
          },
        }),
        expect.objectContaining({
          fileId: "missing-file",
          onBoard: false,
          boardPresence: {
            onBoard: false,
            locatable: false,
            locateKind: "missing-board-element",
            referencedByFileIds: [],
            fallbackFileId: null,
            needsBoardRepair: true,
          },
        }),
      ]),
    );
  });

  it("locates an image element by file id", async () => {
    const updateScene = vi.fn();
    const scrollToContent = vi.fn();
    const result = await handleAgentCommandRequest(
      {
        requestId: "request-1",
        command: "scene.locate",
        payload: {
          projectPath: "/tmp/corestudio-project",
          fileId: "file-1",
        },
      },
      createDeps({
        getExcalidrawAPI: () =>
          ({
            getSceneElementsIncludingDeleted: () => [imageElement],
            updateScene,
            scrollToContent,
          }) as unknown as AgentCommandRuntimeDeps["getExcalidrawAPI"] extends () => infer T
            ? T
            : never,
      }),
    );

    expect(result).toEqual({
      located: true,
      locateKind: "direct",
      elementIds: ["element-1"],
      fileIds: ["file-1"],
      requestedFileIds: ["file-1"],
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
      expect.objectContaining({
        animate: true,
      }),
    );
  });

  it("locates the result image that references an off-board source file", async () => {
    const updateScene = vi.fn();
    const scrollToContent = vi.fn();
    const project = createProject();
    project.imageRecords = {
      "source-file": {
        fileId: "source-file",
        assetPath: "assets/source-file.png",
        sourceType: "imported",
        width: 800,
        height: 800,
        createdAt: "2026-07-02T00:00:00.000Z",
        mimeType: "image/png",
      },
      "result-file": {
        fileId: "result-file",
        assetPath: "assets/result-file.png",
        sourceType: "generated",
        generationOrigin: "acp-agent",
        prompt: "参考源图生成结果",
        width: 1024,
        height: 1024,
        createdAt: "2026-07-02T00:01:00.000Z",
        mimeType: "image/png",
        promptReferences: [
          {
            id: "reference-1",
            index: 1,
            label: "参考图 1",
            kind: "image",
            fileIds: ["source-file"],
          },
        ],
      },
    };
    const resultElement = {
      id: "result-element",
      type: "image",
      isDeleted: false,
      fileId: "result-file",
    } as ExcalidrawElement;

    const result = await handleAgentCommandRequest(
      {
        requestId: "request-1",
        command: "scene.locate",
        payload: {
          projectPath: "/tmp/corestudio-project",
          fileId: "source-file",
        },
      },
      createDeps({
        getProject: () => project,
        getScene: () => ({
          elements: [resultElement],
          appState: ({ selectedElementIds: {}, selectedGroupIds: {} } as unknown) as AppState,
          files: {},
        }),
        getExcalidrawAPI: () =>
          ({
            getSceneElementsIncludingDeleted: () => [resultElement],
            updateScene,
            scrollToContent,
          }) as unknown as AgentCommandRuntimeDeps["getExcalidrawAPI"] extends () => infer T
            ? T
            : never,
      }),
    );

    expect(result).toEqual({
      located: true,
      locateKind: "referenced-by-result",
      elementIds: ["result-element"],
      fileIds: ["result-file"],
      requestedFileIds: ["source-file"],
    });
    expect(scrollToContent).toHaveBeenCalledWith(
      resultElement,
      expect.objectContaining({ animate: true }),
    );
  });

  it("reports a repairable locate miss when a file has no board element", async () => {
    const result = await handleAgentCommandRequest(
      {
        requestId: "request-1",
        command: "scene.locate",
        payload: {
          projectPath: "/tmp/corestudio-project",
          fileId: "missing-file",
        },
      },
      createDeps({
        getExcalidrawAPI: () =>
          ({
            getSceneElementsIncludingDeleted: () => [],
            updateScene: vi.fn(),
            scrollToContent: vi.fn(),
          }) as unknown as AgentCommandRuntimeDeps["getExcalidrawAPI"] extends () => infer T
            ? T
            : never,
      }),
    );

    expect(result).toEqual({
      located: false,
      elementIds: [],
      fileIds: ["missing-file"],
      reason: "missing-board-element",
      repairable: true,
    });
  });

  it("persists ACP task and thread provenance on scene.addImage", async () => {
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

    const result = await handleAgentCommandRequest(
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
      createDeps({
        desktopBridge: {
          persistImageAssets,
        } as unknown as AgentCommandRuntimeDeps["desktopBridge"],
        getExcalidrawAPI: () => ({}) as ExcalidrawImperativeAPI,
        insertAssetsIntoScene,
      }),
    );

    expect(result).toMatchObject({
      inserted: true,
      fileIds: [expect.stringMatching(/^agent-/)],
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

  it("rejects explicitly invalid image provenance on scene.addImage", async () => {
    const persistImageAssets = vi.fn();
    await expect(
      handleAgentCommandRequest(
        {
          requestId: "request-1",
          command: "scene.addImage",
          payload: {
            projectPath: "/tmp/corestudio-project",
            generationOrigin: "manual",
            fileId: "input-file",
            mimeType: "image/png",
            dataBase64: Buffer.from("image").toString("base64"),
            width: 512,
            height: 512,
          },
        },
        createDeps({
          desktopBridge: {
            persistImageAssets,
          } as unknown as AgentCommandRuntimeDeps["desktopBridge"],
          getExcalidrawAPI: () => ({}) as ExcalidrawImperativeAPI,
        }),
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "图片生成来源格式不正确。",
    });
    expect(persistImageAssets).not.toHaveBeenCalled();
  });

  it("rejects explicitly invalid image source types on scene.addImage", async () => {
    const persistImageAssets = vi.fn();
    await expect(
      handleAgentCommandRequest(
        {
          requestId: "request-1",
          command: "scene.addImage",
          payload: {
            projectPath: "/tmp/corestudio-project",
            sourceType: "manual",
            fileId: "input-file",
            mimeType: "image/png",
            dataBase64: Buffer.from("image").toString("base64"),
            width: 512,
            height: 512,
          },
        },
        createDeps({
          desktopBridge: {
            persistImageAssets,
          } as unknown as AgentCommandRuntimeDeps["desktopBridge"],
          getExcalidrawAPI: () => ({}) as ExcalidrawImperativeAPI,
        }),
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "图片必须记录有效来源类型。",
    });
    expect(persistImageAssets).not.toHaveBeenCalled();
  });

  it("rejects empty explicit reference ids on scene.addImage", async () => {
    const persistImageAssets = vi.fn();
    await expect(
      handleAgentCommandRequest(
        {
          requestId: "request-1",
          command: "scene.addImage",
          payload: {
            projectPath: "/tmp/corestudio-project",
            generationOrigin: "acp-agent",
            referenceFileIds: " , ",
            fileId: "input-file",
            mimeType: "image/png",
            dataBase64: Buffer.from("image").toString("base64"),
            width: 512,
            height: 512,
          },
        },
        createDeps({
          desktopBridge: {
            persistImageAssets,
          } as unknown as AgentCommandRuntimeDeps["desktopBridge"],
          getExcalidrawAPI: () => ({}) as ExcalidrawImperativeAPI,
        }),
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "referenceFileIds 不能为空。",
    });
    expect(persistImageAssets).not.toHaveBeenCalled();
  });

  it("rejects malformed explicit prompt references on scene.addImage", async () => {
    const persistImageAssets = vi.fn();
    await expect(
      handleAgentCommandRequest(
        {
          requestId: "request-1",
          command: "scene.addImage",
          payload: {
            projectPath: "/tmp/corestudio-project",
            generationOrigin: "acp-agent",
            promptReferences: [
              {
                id: "reference-empty",
                label: "参考图 1",
              },
            ],
            fileId: "input-file",
            mimeType: "image/png",
            dataBase64: Buffer.from("image").toString("base64"),
            width: 512,
            height: 512,
          },
        },
        createDeps({
          desktopBridge: {
            persistImageAssets,
          } as unknown as AgentCommandRuntimeDeps["desktopBridge"],
          getExcalidrawAPI: () => ({}) as ExcalidrawImperativeAPI,
        }),
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "promptReferences 每项需要 fileIds 或 elementIds。",
    });
    expect(persistImageAssets).not.toHaveBeenCalled();
  });
});
