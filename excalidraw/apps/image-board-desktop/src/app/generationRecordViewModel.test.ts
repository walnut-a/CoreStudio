import { describe, expect, it, vi } from "vitest";

import {
  buildDirectGenerationRecordItems,
  buildGenerationSidebarRecordItems,
  createGenerationRecordRendererActions,
  getGenerationRecordTimeLabel,
  runGenerationRecordPromptCopyAction,
} from "./generationRecordViewModel";
import { setActiveDesktopLocale } from "./copy";

import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ImageRecord, ImageRecordMap } from "../shared/projectTypes";

const createImageRecord = (patch: Partial<ImageRecord> = {}): ImageRecord => ({
  fileId: "file-generated-1",
  assetPath: "assets/file-generated-1.png",
  sourceType: "generated",
  generationOrigin: "corestudio",
  provider: "zenmux",
  model: "mock-model",
  prompt: "做一台桌面级五轴 CNC 机器",
  width: 1536,
  height: 1024,
  createdAt: "2026-07-02T08:05:00.000Z",
  mimeType: "image/png",
  ...patch,
});

describe("generation record localization", () => {
  it("formats dates with the active application locale", () => {
    const formatter = vi
      .spyOn(Date.prototype, "toLocaleString")
      .mockReturnValue("localized");
    setActiveDesktopLocale("en");

    expect(getGenerationRecordTimeLabel("2026-07-02T08:05:00.000Z")).toBe(
      "localized",
    );
    expect(formatter).toHaveBeenCalledWith("en", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    formatter.mockRestore();
    setActiveDesktopLocale("zh-CN");
  });

  it("localizes generated fallback titles and board status labels", () => {
    setActiveDesktopLocale("en");
    const records: ImageRecordMap = {
      "file-missing-1": createImageRecord({
        fileId: "file-missing-1",
        assetPath: "assets/file-missing-1.png",
        prompt: "",
      }),
    };

    expect(buildDirectGenerationRecordItems(records, [])).toMatchObject([
      {
        title: "Untitled generation",
        statusLabel: "Not on board",
      },
    ]);
    setActiveDesktopLocale("zh-CN");
  });
});

describe("buildDirectGenerationRecordItems", () => {
  it("builds generation records including Agent Board results", () => {
    const records: ImageRecordMap = {
      "file-generated-1": createImageRecord(),
      "file-agent-board-1": createImageRecord({
        fileId: "file-agent-board-1",
        assetPath: "assets/file-agent-board-1.png",
        generationOrigin: "agent-board",
        prompt: "Agent Board 生成结果",
      }),
      "file-imported-1": createImageRecord({
        fileId: "file-imported-1",
        assetPath: "assets/file-imported-1.png",
        sourceType: "imported",
        generationOrigin: undefined,
      }),
    };

    expect(
      buildDirectGenerationRecordItems(records, ["file-generated-1"]),
    ).toEqual([
      {
        id: "file-generated-1",
        fileId: "file-generated-1",
        title: "做一台桌面级五轴 CNC 机器",
        meta: expect.stringContaining("ZenMux · 1536 × 1024"),
        statusLabel: undefined,
      },
      {
        id: "file-agent-board-1",
        fileId: "file-agent-board-1",
        title: "Agent Board 生成结果",
        meta: expect.stringContaining("ZenMux · 1536 × 1024"),
        statusLabel: "未在画板",
      },
    ]);
  });

  it("adds thumbnails from loaded canvas files to direct generation records", () => {
    const records: ImageRecordMap = {
      "file-generated-1": createImageRecord(),
    };
    const files = {
      "file-generated-1": {
        id: "file-generated-1",
        mimeType: "image/png",
        dataURL: "data:image/png;base64,direct-thumb",
        created: 1,
      },
    } as unknown as BinaryFiles;

    expect(
      buildDirectGenerationRecordItems(records, ["file-generated-1"], files),
    ).toEqual([
      expect.objectContaining({
        fileId: "file-generated-1",
        thumbnailDataUrl: "data:image/png;base64,direct-thumb",
      }),
    ]);
  });

  it("labels generated records that are only present through a live prompt reference", () => {
    const records: ImageRecordMap = {
      "file-reference-1": createImageRecord({
        fileId: "file-reference-1",
        assetPath: "assets/file-reference-1.png",
        prompt: "参考图",
        createdAt: "2026-07-02T08:00:00.000Z",
      }),
      "file-result-1": createImageRecord({
        fileId: "file-result-1",
        assetPath: "assets/file-result-1.png",
        prompt: "基于参考图生成",
        createdAt: "2026-07-02T08:10:00.000Z",
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
    };

    const items = buildDirectGenerationRecordItems(records, ["file-result-1"]);

    expect(items).toMatchObject([
      {
        fileId: "file-result-1",
        statusLabel: undefined,
      },
      {
        fileId: "file-reference-1",
        statusLabel: "引用链中间图",
      },
    ]);
  });

  it("labels direct generated records that are missing from the board", () => {
    const records: ImageRecordMap = {
      "file-missing-1": createImageRecord({
        fileId: "file-missing-1",
        assetPath: "assets/file-missing-1.png",
        prompt: "",
        provider: undefined,
        createdAt: "not-a-date",
      }),
    };

    expect(buildDirectGenerationRecordItems(records, [])).toEqual([
      {
        id: "file-missing-1",
        fileId: "file-missing-1",
        title: "未命名生成",
        meta: "CoreStudio · 1536 × 1024",
        statusLabel: "未在画板",
      },
    ]);
  });
});

describe("runGenerationRecordPromptCopyAction", () => {
  it("copies the selected generated record prompt", async () => {
    const copyText = vi.fn().mockResolvedValue(true);
    const selectedRecord = createImageRecord({
      prompt: "做一台桌面级 CNC",
    });

    await expect(
      runGenerationRecordPromptCopyAction({
        selectedRecord,
        copyText,
      }),
    ).resolves.toBe(true);

    expect(copyText).toHaveBeenCalledWith("做一台桌面级 CNC");
  });

  it("skips copying when the selected record has no prompt", async () => {
    const copyText = vi.fn().mockResolvedValue(true);

    await expect(
      runGenerationRecordPromptCopyAction({
        selectedRecord: createImageRecord({ prompt: "" }),
        copyText,
      }),
    ).resolves.toBe(false);

    expect(copyText).not.toHaveBeenCalled();
  });
});

describe("createGenerationRecordRendererActions", () => {
  it("creates a renderer action for copying the selected record prompt", async () => {
    const selectedRecord = createImageRecord({
      prompt: "复制这条生成记录的提示词",
    });
    const getSelectedRecord = vi.fn(() => selectedRecord);
    const copyText = vi.fn().mockResolvedValue(true);

    const actions = createGenerationRecordRendererActions({
      getSelectedRecord,
      copyText,
    });

    await expect(actions.copyPrompt()).resolves.toBe(true);

    expect(getSelectedRecord).toHaveBeenCalledTimes(1);
    expect(copyText).toHaveBeenCalledWith("复制这条生成记录的提示词");
  });
});

describe("buildGenerationSidebarRecordItems", () => {
  it("returns empty sidebar record groups when there is no project", () => {
    expect(
      buildGenerationSidebarRecordItems({
        project: null,
        sceneImageFileIds: ["file-generated-1"],
        files: null,
      }),
    ).toEqual({
      generationRecords: [],
    });
  });

  it("keeps Agent Board images in the ordinary generation history", () => {
    const imageRecords: ImageRecordMap = {
      "file-generated-1": createImageRecord(),
      "file-agent-board-1": createImageRecord({
        fileId: "file-agent-board-1",
        assetPath: "assets/file-agent-board-1.png",
        generationOrigin: "agent-board",
        prompt: "Agent Board 生成结果",
        createdAt: "2026-07-02T08:06:00.000Z",
      }),
    };
    const files = {
      "file-agent-board-1": {
        id: "file-agent-board-1",
        mimeType: "image/png",
        dataURL: "data:image/png;base64,thumb",
        created: 1,
      },
    } as unknown as BinaryFiles;

    expect(
      buildGenerationSidebarRecordItems({
        project: { imageRecords },
        sceneImageFileIds: ["file-generated-1", "file-agent-board-1"],
        files,
      }),
    ).toEqual({
      generationRecords: [
        expect.objectContaining({
          fileId: "file-agent-board-1",
          title: "Agent Board 生成结果",
          thumbnailDataUrl: "data:image/png;base64,thumb",
        }),
        expect.objectContaining({
          fileId: "file-generated-1",
          title: "做一台桌面级五轴 CNC 机器",
        }),
      ],
    });
  });
});
