import { describe, expect, it, vi } from "vitest";

import { handleAgentReadCommand } from "./agentCommandReadRuntime";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import type {
  AgentCommandRuntimeDeps,
  AgentCommandSceneSnapshot,
} from "./agentCommandRuntimeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";

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
    projectId: "project-id-1",
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
  appState: {
    selectedElementIds: { "element-1": true },
    selectedGroupIds: {},
  } as unknown as AppState,
  files: {},
});

const createDeps = (
  patch: Partial<AgentCommandRuntimeDeps> = {},
): AgentCommandRuntimeDeps => ({
  desktopBridge: {} as AgentCommandRuntimeDeps["desktopBridge"],
  getProject: () => createProject(),
  getScene: createScene,
  getExcalidrawAPI: () => null,
  readProjectImageAssets: vi.fn(async () => []),
  beginImageWriteback: vi.fn(),
  insertAssetsIntoScene: vi.fn(async () => undefined),
  restoreScene: vi.fn(),
  flushPendingAutosave: vi.fn(async () => undefined),
  ...patch,
});

describe("agentCommandReadRuntime", () => {
  it("returns the stable project identity needed by fixed references", async () => {
    const result = await handleAgentReadCommand(
      {
        requestId: "request-1",
        command: "project.current",
      },
      {
        project: createProject(),
        deps: createDeps(),
      },
    );

    expect(result).toEqual({
      handled: true,
      value: {
        projectPath: "/tmp/corestudio-project",
        projectId: "project-id-1",
        name: "测试项目",
        createdAt: "2026-07-02T00:00:00.000Z",
        updatedAt: "2026-07-02T00:00:00.000Z",
      },
    });
  });

  it.each([
    {
      command: "project.health" as const,
      payload: undefined,
      capability: "inspectProjectHealth",
      message: "当前环境不能检查项目健康度。",
    },
  ])(
    "throws structured capability errors for $command",
    async ({ command, payload, capability, message }) => {
      await expect(
        handleAgentReadCommand(
          {
            requestId: "request-1",
            command,
            payload,
          },
          {
            project: createProject(),
            deps: createDeps(),
          },
        ),
      ).rejects.toMatchObject({
        code: "CAPABILITY_UNAVAILABLE",
        message,
        details: {
          command,
          capability,
        },
      });
    },
  );

  it("returns project records with board presence", async () => {
    const result = await handleAgentReadCommand(
      {
        requestId: "request-1",
        command: "project.records",
      },
      {
        project: createProject(),
        deps: createDeps(),
      },
    );

    expect(result).toMatchObject({
      handled: true,
      value: {
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
          },
        ],
      },
    });
  });

  it("returns selected image paths", async () => {
    const result = await handleAgentReadCommand(
      {
        requestId: "request-1",
        command: "scene.imagePaths",
        payload: { selectionOnly: true },
      },
      {
        project: createProject(),
        deps: createDeps(),
      },
    );

    expect(result).toMatchObject({
      handled: true,
      value: {
        projectPath: "/tmp/corestudio-project",
        selectionOnly: true,
        items: [
          {
            fileId: "file-1",
            path: "/tmp/corestudio-project/assets/file-1.png",
          },
        ],
      },
    });
  });

  it("does not handle write commands", async () => {
    await expect(
      handleAgentReadCommand(
        {
          requestId: "request-1",
          command: "scene.addImage",
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
