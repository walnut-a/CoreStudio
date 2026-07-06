import { describe, expect, it } from "vitest";

import {
  buildAcpSelectionItems,
  buildAcpTaskRequest,
  getAcpBridgeBaseUrl,
  getAcpTaskPromptText,
} from "./acpTaskRequestBuilder";

import type {
  DesktopAgentBridgeStatus,
  DesktopProjectBundle,
} from "../../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../../shared/providerTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  generationSource: "agent",
  provider: "gemini",
  model: "gemini-image",
  prompt: "优化这台设备",
  width: 1024,
  height: 1024,
  imageCount: 1,
  reference: null,
  ...patch,
});

const createProject = (
  imageRecords: ImageRecordMap = {},
): DesktopProjectBundle => ({
  projectPath: "/Users/example/CoreStudio/工业设计助手",
  sceneJson: "{}",
  imageRecords,
  project: {
    formatVersion: 1,
    appVersion: "1.0.0",
    name: "工业设计助手",
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
});

const createStatus = (
  boardUrl:
    | DesktopAgentBridgeStatus["boardUrl"] =
    "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=project-token",
): DesktopAgentBridgeStatus => ({
  enabled: true,
  ready: true,
  boardUrl,
  currentProject: {
    name: "工业设计助手",
    projectPath: "/Users/example/CoreStudio/工业设计助手",
    agentAccess: {
      enabled: true,
      token: "project-token",
    },
  },
});

describe("getAcpBridgeBaseUrl", () => {
  it("reads the bridge base URL from status board URL before the page URL", () => {
    expect(
      getAcpBridgeBaseUrl({
        status: createStatus(),
        pageUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60000",
      }),
    ).toBe("http://127.0.0.1:60909");
  });

  it("falls back to the page URL when status has no usable board URL", () => {
    expect(
      getAcpBridgeBaseUrl({
        status: createStatus("not a url"),
        pageUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A61000",
      }),
    ).toBe("http://127.0.0.1:61000");
  });
});

describe("buildAcpSelectionItems", () => {
  it("deduplicates selected elements and maps image, text, arrow and shape items", () => {
    const imageRecords: ImageRecordMap = {
      imageFile: {
        fileId: "imageFile",
        assetPath: "assets/image.png",
        sourceType: "imported",
        width: 512,
        height: 512,
        createdAt: "2026-07-03T00:00:00.000Z",
        mimeType: "image/png",
      },
    };
    const request = createRequest({
      reference: {
        enabled: true,
        elementCount: 3,
        textCount: 1,
        items: [
          {
            id: "image-element",
            index: 1,
            kind: "image",
            label: "图片",
            fileId: "imageFile",
          },
          {
            id: "text-element",
            index: 2,
            kind: "text",
            label: "文本",
          },
          {
            id: "arrow-element",
            index: 3,
            kind: "shape",
            label: "箭头",
          },
        ],
      },
      promptReferences: [
        {
          id: "prompt-ref",
          label: "参考图",
          enabled: true,
          elementCount: 2,
          textCount: 0,
          items: [
            {
              id: "image-element",
              index: 1,
              kind: "image",
              label: "图片",
              fileId: "imageFile",
            },
            {
              id: "shape-element",
              index: 4,
              kind: "shape",
              label: "矩形",
            },
          ],
        },
      ],
    });

    expect(buildAcpSelectionItems(request, imageRecords)).toEqual([
      {
        index: 1,
        elementId: "image-element",
        kind: "image",
        label: "图片",
        fileId: "imageFile",
        imageId: "imageFile",
      },
      {
        index: 2,
        elementId: "text-element",
        kind: "text",
        label: "文本",
      },
      {
        index: 3,
        elementId: "arrow-element",
        kind: "arrow",
        label: "箭头",
      },
      {
        index: 4,
        elementId: "shape-element",
        kind: "shape",
        label: "矩形",
      },
    ]);
  });
});

describe("getAcpTaskPromptText", () => {
  it("uses inline prompt references before falling back to the plain prompt", () => {
    expect(
      getAcpTaskPromptText(
        createRequest({
          prompt: "原始 prompt",
          promptParts: [
            { type: "text", text: "基于 " },
            { type: "reference", referenceId: "ref-1" },
            { type: "text", text: " 优化" },
          ],
          promptReferences: [
            {
              id: "ref-1",
              label: "图片",
              enabled: true,
              elementCount: 1,
              textCount: 0,
              image: {
                mimeType: "image/png",
                dataBase64: "abc",
              },
            },
          ],
        }),
      ),
    ).toBe("基于 参考图 1 优化");
  });
});

describe("buildAcpTaskRequest", () => {
  it("builds a task package with injected ids, project context, prompt and selection", () => {
    const request = createRequest({
      prompt: "",
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
        items: [
          {
            id: "image-element",
            index: 1,
            kind: "image",
            label: "图片",
            fileId: "imageFile",
          },
        ],
      },
    });

    expect(
      buildAcpTaskRequest({
        request,
        project: createProject({
          imageFile: {
            fileId: "imageFile",
            assetPath: "assets/image.png",
            sourceType: "imported",
            width: 512,
            height: 512,
            createdAt: "2026-07-03T00:00:00.000Z",
            mimeType: "image/png",
          },
        }),
        status: createStatus(),
        pageUrl: "http://127.0.0.1:5174/",
        agentId: "default-agent",
        threadId: "thread-1",
        taskId: "task-1",
      }),
    ).toMatchObject({
      taskId: "task-1",
      threadId: "thread-1",
      agentId: "default-agent",
      userPrompt: "请根据当前 CoreStudio 画板继续操作。",
      project: {
        name: "工业设计助手",
        projectPath: "/Users/example/CoreStudio/工业设计助手",
        token: "project-token",
        bridgeBaseUrl: "http://127.0.0.1:60909",
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=project-token",
      },
      generation: {
        source: "agent",
      },
      selection: {
        elementCount: 1,
        items: [
          {
            index: 1,
            elementId: "image-element",
            kind: "image",
            label: "图片",
            fileId: "imageFile",
            imageId: "imageFile",
          },
        ],
      },
    });
  });

  it("throws a clear error when no bridge base URL is available", () => {
    expect(() =>
      buildAcpTaskRequest({
        request: createRequest(),
        project: createProject(),
        status: createStatus(null),
        pageUrl: "http://127.0.0.1:5174/",
        agentId: "default-agent",
        threadId: "thread-1",
        taskId: "task-1",
      }),
    ).toThrow("Agent Bridge 地址尚未就绪。");
  });
});
