import { describe, expect, it, vi } from "vitest";

import type { ImageRecord, ImageRecordMap } from "../shared/projectTypes";
import {
  buildImageAssetItems,
  createImageAssetRendererActions,
  runImageAssetPromptCopyAction,
} from "./imageAssetViewModel";

const createRecord = (patch: Partial<ImageRecord>): ImageRecord => ({
  fileId: "file",
  assetPath: "assets/file.png",
  sourceType: "imported",
  width: 512,
  height: 512,
  createdAt: "2026-07-24T00:00:00.000Z",
  mimeType: "image/png",
  ...patch,
});

describe("buildImageAssetItems", () => {
  const imageRecords: ImageRecordMap = {
    "live-imported": createRecord({
      fileId: "live-imported",
      createdAt: "2026-07-24T00:03:00.000Z",
    }),
    "live-generated": createRecord({
      fileId: "live-generated",
      sourceType: "generated",
      generationOrigin: "agent-board",
      prompt: "机床方案",
      createdAt: "2026-07-24T00:02:00.000Z",
      promptReferences: [
        {
          id: "reference-1",
          index: 1,
          label: "参考图 1",
          kind: "image",
          fileIds: ["reference-imported"],
        },
      ],
    }),
    "reference-imported": createRecord({
      fileId: "reference-imported",
      createdAt: "2026-07-24T00:01:00.000Z",
    }),
    "unrelated-generated": createRecord({
      fileId: "unrelated-generated",
      sourceType: "generated",
      generationOrigin: "corestudio",
      prompt: "历史结果",
      createdAt: "2026-07-24T00:04:00.000Z",
    }),
  };

  it("shows only live canvas images and referenced images", () => {
    expect(
      buildImageAssetItems({
        imageRecords,
        sceneImageFileIds: ["live-imported", "live-generated"],
        generatedOnly: false,
      }).map((item) => ({
        fileId: item.fileId,
        relationshipLabels: item.relationshipLabels,
      })),
    ).toEqual([
      {
        fileId: "live-imported",
        relationshipLabels: ["画布中"],
      },
      {
        fileId: "live-generated",
        relationshipLabels: ["画布中"],
      },
      {
        fileId: "reference-imported",
        relationshipLabels: ["参考图"],
      },
    ]);
  });

  it("filters the same candidate set to generated records", () => {
    expect(
      buildImageAssetItems({
        imageRecords,
        sceneImageFileIds: ["live-imported", "live-generated"],
        generatedOnly: true,
      }).map((item) => item.fileId),
    ).toEqual(["live-generated"]);
  });

  it("deduplicates an image that is both on canvas and referenced", () => {
    expect(
      buildImageAssetItems({
        imageRecords: {
          ...imageRecords,
          "live-generated": {
            ...imageRecords["live-generated"],
            promptReferences: [
              {
                id: "reference-1",
                index: 1,
                label: "参考图 1",
                kind: "image",
                fileIds: ["live-imported"],
              },
            ],
          },
        },
        sceneImageFileIds: ["live-imported", "live-generated"],
        generatedOnly: false,
      }).find((item) => item.fileId === "live-imported"),
    ).toMatchObject({
      relationshipLabels: ["画布中", "参考图"],
    });
  });
});

describe("image asset prompt actions", () => {
  it("copies the selected asset prompt", async () => {
    const copyText = vi.fn().mockResolvedValue(true);

    await expect(
      runImageAssetPromptCopyAction({
        selectedRecord: { prompt: "一台桌面级 CNC" },
        copyText,
      }),
    ).resolves.toBe(true);

    expect(copyText).toHaveBeenCalledWith("一台桌面级 CNC");
  });

  it("skips an asset without a prompt", async () => {
    const copyText = vi.fn().mockResolvedValue(true);

    await expect(
      createImageAssetRendererActions({
        getSelectedRecord: () => ({ prompt: "" }),
        copyText,
      }).copyPrompt(),
    ).resolves.toBe(false);

    expect(copyText).not.toHaveBeenCalled();
  });
});
