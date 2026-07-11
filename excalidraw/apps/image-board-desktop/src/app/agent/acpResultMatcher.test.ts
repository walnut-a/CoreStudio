import { describe, expect, it } from "vitest";

import { buildAcpAgentResultRecordItems } from "./acpResultMatcher";

import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { AcpRunLogDetail, AcpRunLogEntry } from "../../shared/acpTypes";
import type { ImageRecord, ImageRecordMap } from "../../shared/projectTypes";

const createImageRecord = (patch: Partial<ImageRecord> = {}): ImageRecord => ({
  fileId: "file-acp-1",
  assetPath: "assets/file-acp-1.png",
  sourceType: "generated",
  generationOrigin: "acp-agent",
  provider: "zenmux",
  model: "mock-model",
  prompt: "优化这台 CNC 机器",
  width: 1024,
  height: 1024,
  createdAt: "2026-07-02T08:05:00.000Z",
  mimeType: "image/png",
  ...patch,
});

const createRunLogDetail = (
  patch: Partial<AcpRunLogDetail["summary"]> = {},
): AcpRunLogDetail => ({
  summary: {
    mode: "acp-agent",
    taskId: "task-1",
    threadId: "thread-1",
    projectToken: "project-token",
    projectName: "工业设计助手",
    agentName: "Codex ACP",
    userPrompt: "优化这台 CNC 机器",
    status: "completed",
    startedAt: "2026-07-02T08:00:00.000Z",
    endedAt: "2026-07-02T08:10:00.000Z",
    logFile: "/tmp/task-1.jsonl",
    ...patch,
  },
  entries: [],
});

const createRunLogEntry = (
  patch: Partial<AcpRunLogEntry> = {},
): AcpRunLogEntry => ({
  version: 1,
  taskId: "task-1",
  timestamp: "2026-07-02T08:00:00.000Z",
  seq: 1,
  kind: "task.package",
  payload: {
    userPrompt: "优化这台 CNC 机器",
  },
  ...patch,
});

describe("buildAcpAgentResultRecordItems", () => {
  it("builds locatable ACP result records from run log context", () => {
    const imageRecords: ImageRecordMap = {
      "file-acp-1": createImageRecord(),
      "file-acp-2": createImageRecord({
        fileId: "file-acp-2",
        assetPath: "assets/file-acp-2.png",
        prompt: "另一条无关任务",
      }),
      "file-corestudio-1": createImageRecord({
        fileId: "file-corestudio-1",
        assetPath: "assets/file-corestudio-1.png",
        generationOrigin: "corestudio",
      }),
    };
    const files = {
      "file-acp-1": {
        id: "file-acp-1",
        mimeType: "image/png",
        dataURL: "data:image/png;base64,thumbnail",
        created: 1,
      },
    } as unknown as BinaryFiles;

    const items = buildAcpAgentResultRecordItems({
      imageRecords: {
        ...imageRecords,
        "file-acp-1": createImageRecord({
          promptReferences: [
            {
              id: "reference-1",
              index: 1,
              label: "参考图 1",
              kind: "image",
              fileIds: ["file-reference-1"],
            },
          ],
        }),
      },
      sceneImageFileIds: ["file-acp-1"],
      entries: [],
      runLogDetail: createRunLogDetail(),
      task: null,
      files,
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: "file-acp-1",
        fileId: "file-acp-1",
        title: "优化这台 CNC 机器",
        meta: expect.stringContaining("ACP Agent · 1024 × 1024"),
        prompt: "优化这台 CNC 机器",
        model: "mock-model",
        sizeLabel: "1024 × 1024",
        statusLabel: "已在画板",
        referenceCount: 1,
        thumbnailDataUrl: "data:image/png;base64,thumbnail",
        createdAt: "2026-07-02T08:05:00.000Z",
      }),
    ]);
  });

  it("uses the active task prompt when the run log is not loaded yet", () => {
    const items = buildAcpAgentResultRecordItems({
      imageRecords: {
        "file-acp-1": createImageRecord({
          createdAt: "2026-07-02T09:30:00.000Z",
        }),
      },
      sceneImageFileIds: [],
      entries: [],
      runLogDetail: null,
      task: {
        taskId: "task-live",
        message: "优化这台 CNC 机器",
      },
      files: null,
    });

    expect(items).toMatchObject([
      {
        fileId: "file-acp-1",
        statusLabel: "未在画板",
      },
    ]);
  });

  it("matches prompt-less ACP records by task time window", () => {
    const items = buildAcpAgentResultRecordItems({
      imageRecords: {
        "file-acp-1": createImageRecord({
          prompt: "",
          createdAt: "2026-07-02T08:12:00.000Z",
        }),
      },
      sceneImageFileIds: [],
      entries: [
        createRunLogEntry({
          timestamp: "2026-07-02T08:00:00.000Z",
        }),
        createRunLogEntry({
          timestamp: "2026-07-02T08:03:00.000Z",
          seq: 2,
          kind: "agent.message",
          payload: {
            text: "正在生成图片",
          },
        }),
      ],
      runLogDetail: null,
      task: null,
      files: null,
    });

    expect(items).toMatchObject([
      {
        fileId: "file-acp-1",
        title: "未命名生成",
      },
    ]);
  });

  it("matches ACP result records by explicit task id before prompt or time fallback", () => {
    const items = buildAcpAgentResultRecordItems({
      imageRecords: {
        "file-acp-1": createImageRecord({
          generationTaskId: "task-1",
          generationThreadId: "thread-1",
          prompt: "另一条 prompt",
          createdAt: "2026-07-02T06:00:00.000Z",
        }),
      },
      sceneImageFileIds: ["file-acp-1"],
      entries: [],
      runLogDetail: createRunLogDetail(),
      task: null,
      files: null,
    });

    expect(items).toMatchObject([
      {
        fileId: "file-acp-1",
        title: "另一条 prompt",
        statusLabel: "已在画板",
      },
    ]);
  });

  it("does not reuse prompt and time fallback when an ACP record belongs to another task", () => {
    const items = buildAcpAgentResultRecordItems({
      imageRecords: {
        "file-acp-1": createImageRecord({
          generationTaskId: "task-2",
          prompt: "优化这台 CNC 机器",
          createdAt: "2026-07-02T08:05:00.000Z",
        }),
      },
      sceneImageFileIds: ["file-acp-1"],
      entries: [],
      runLogDetail: createRunLogDetail(),
      task: null,
      files: null,
    });

    expect(items).toEqual([]);
  });

  it("returns no result records without ACP task context", () => {
    const items = buildAcpAgentResultRecordItems({
      imageRecords: {
        "file-acp-1": createImageRecord(),
      },
      sceneImageFileIds: ["file-acp-1"],
      entries: [],
      runLogDetail: null,
      task: null,
      files: null,
    });

    expect(items).toEqual([]);
  });
});
