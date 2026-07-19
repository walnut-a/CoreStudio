import { describe, expect, it, vi } from "vitest";

import {
  getProjectImageRecordsPath,
  parseProjectImageRecords,
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
  it("normalizes compatible legacy provenance and quarantines unsafe records", () => {
    const result = parseProjectImageRecords({
      legacy: createImageRecord({
        fileId: "legacy",
        sourceType: "generated",
      }),
      imported: createImageRecord({
        fileId: "imported",
        sourceType: "imported",
        generationOrigin: "agent-board",
      }),
      external: createImageRecord({
        fileId: "external",
        sourceType: "generated",
        generationOrigin: "agent-board",
        provider: "external-image-service",
      }),
      mismatch: createImageRecord({
        fileId: "different-file-id",
      }),
    });

    expect(result.imageRecords).toMatchObject({
      legacy: {
        generationOrigin: "corestudio",
      },
      imported: {
        sourceType: "imported",
      },
      external: {
        provider: "external-image-service",
      },
    });
    expect(result.imageRecords.imported.generationOrigin).toBeUndefined();
    expect(result.imageRecords.mismatch).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "inconsistent-provenance",
          fileId: "legacy",
          repairable: true,
        }),
        expect.objectContaining({
          code: "inconsistent-provenance",
          fileId: "imported",
          repairable: true,
        }),
        expect.objectContaining({
          code: "record-key-mismatch",
          fileId: "mismatch",
          repairable: false,
        }),
      ]),
    );
  });

  it("drops invalid provider metadata from the runtime record without dropping the asset record", () => {
    const result = parseProjectImageRecords({
      invalid: {
        ...createImageRecord({ fileId: "invalid" }),
        provider: { name: "broken" },
      },
    });

    expect(result.imageRecords.invalid).toBeDefined();
    expect(result.imageRecords.invalid.provider).toBeUndefined();
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "invalid-provider-metadata",
        fileId: "invalid",
        repairable: false,
      }),
    );
  });

  it("keeps an invalid timestamp readable while reporting its metadata", () => {
    const result = parseProjectImageRecords({
      invalidTime: createImageRecord({
        fileId: "invalidTime",
        createdAt: "not-a-date",
      }),
    });

    expect(result.imageRecords.invalidTime.createdAt).toBe("not-a-date");
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "invalid-record-field",
        fileId: "invalidTime",
        repairable: false,
      }),
    );
  });

  it("sanitizes malformed optional fields before records reach the renderer", () => {
    const result = parseProjectImageRecords({
      unsafe: {
        ...createImageRecord({ fileId: "unsafe" }),
        prompt: { text: "broken" },
        model: 42,
        promptReferences: [null],
      },
      invalidSize: {
        ...createImageRecord({ fileId: "invalidSize" }),
        width: Number.POSITIVE_INFINITY,
      },
    });

    expect(result.imageRecords.unsafe).toEqual(
      expect.objectContaining({ fileId: "unsafe" }),
    );
    expect(result.imageRecords.unsafe.prompt).toBeUndefined();
    expect(result.imageRecords.unsafe.model).toBeUndefined();
    expect(result.imageRecords.unsafe.promptReferences).toBeUndefined();
    expect(result.imageRecords.invalidSize).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalid-record-field",
          fileId: "unsafe",
        }),
        expect.objectContaining({
          code: "invalid-record-field",
          fileId: "invalidSize",
        }),
      ]),
    );
  });

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

  it("repairs deterministic provenance without sanitizing unrelated raw fields", () => {
    const rawRecords = {
      legacy: createImageRecord({
        fileId: "legacy",
        sourceType: "generated",
      }),
      imported: createImageRecord({
        fileId: "imported",
        generationOrigin: "agent-board",
      }),
      untouched: {
        ...createImageRecord({ fileId: "untouched" }),
        provider: { name: "preserve-on-disk" },
      },
    } as unknown as ImageRecordMap;

    const result = repairLegacyGeneratedImageRecordOrigins(rawRecords);

    expect(result.repairedFileIds).toEqual(["legacy"]);
    expect(result.repairedProvenanceFileIds).toEqual(["legacy", "imported"]);
    expect(result.imageRecords.legacy.generationOrigin).toBe("corestudio");
    expect(result.imageRecords.imported.generationOrigin).toBeUndefined();
    expect(result.imageRecords.untouched).toBe(rawRecords.untouched);
  });
});
