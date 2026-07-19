import { describe, expect, it, vi } from "vitest";

import {
  getProjectImageRecordsPath,
  readProjectImageRecords,
  repairLegacyGeneratedImageRecordOrigins,
  writeProjectImageRecords,
} from "./projectImageRecords";

import type { ImageRecord, ImageRecordMap } from "../../src/shared/projectTypes";

const createImageRecord = (patch: Partial<ImageRecord> = {}): ImageRecord => ({
  fileId: "file-ok",
  assetPath: "assets/file-ok.png",
  sourceType: "imported",
  width: 1024,
  height: 1024,
  createdAt: "2026-07-02T00:00:00.000Z",
  mimeType: "image/png",
  ...patch,
});

describe("projectImageRecords", () => {
  it("reads and writes image records through the project metadata path", async () => {
    const imageRecords: ImageRecordMap = {
      "file-ok": createImageRecord({ fileId: "file-ok" }),
    };
    const readText = vi.fn().mockResolvedValue(JSON.stringify(imageRecords));
    const writeJson = vi.fn().mockResolvedValue(undefined);

    await expect(
      readProjectImageRecords("/tmp/project", { readText }),
    ).resolves.toEqual(imageRecords);
    await writeProjectImageRecords("/tmp/project", imageRecords, {
      writeJson,
    });

    expect(readText).toHaveBeenCalledWith(
      getProjectImageRecordsPath("/tmp/project"),
    );
    expect(writeJson).toHaveBeenCalledWith(
      getProjectImageRecordsPath("/tmp/project"),
      imageRecords,
    );
  });

  it("repairs only generated image records that are missing an origin", () => {
    const imageRecords: ImageRecordMap = {
      "legacy-generated": createImageRecord({
        fileId: "legacy-generated",
        sourceType: "generated",
      }),
      "modern-generated": createImageRecord({
        fileId: "modern-generated",
        sourceType: "generated",
        generationOrigin: "agent-board",
      }),
      "imported-file": createImageRecord({
        fileId: "imported-file",
        sourceType: "imported",
      }),
    };

    const result = repairLegacyGeneratedImageRecordOrigins(imageRecords);

    expect(result.repairedFileIds).toEqual(["legacy-generated"]);
    expect(result.imageRecords["legacy-generated"]).toEqual(
      expect.objectContaining({
        generationOrigin: "corestudio",
      }),
    );
    expect(result.imageRecords["modern-generated"]).toBe(
      imageRecords["modern-generated"],
    );
    expect(result.imageRecords["imported-file"]).toBe(
      imageRecords["imported-file"],
    );
  });
});
