import { describe, expect, it, vi } from "vitest";

import { readLocalImagePayload } from "./localImagePayload";

const fixedDate = new Date("2026-06-24T10:20:30.000Z");

describe("readLocalImagePayload", () => {
  it("builds an imported image payload for a png file", async () => {
    const buffer = Buffer.from("png bytes");

    await expect(
      readLocalImagePayload("/tmp/mock/design.png", {
        readFile: vi.fn(async () => buffer),
        inspectImage: vi.fn(() => ({
          width: 320,
          height: 240,
        })),
        now: () => fixedDate,
        randomId: () => "image-id",
      }),
    ).resolves.toEqual({
      fileId: "image-id",
      fileName: "design.png",
      mimeType: "image/png",
      dataBase64: buffer.toString("base64"),
      width: 320,
      height: 240,
      createdAt: fixedDate.toISOString(),
    });
  });

  it("rejects unsupported extensions before reading the file", async () => {
    const readFile = vi.fn(async () => Buffer.from("not an image"));

    await expect(
      readLocalImagePayload("/tmp/mock/notes.txt", {
        readFile,
        inspectImage: vi.fn(() => ({
          width: 1,
          height: 1,
        })),
      }),
    ).rejects.toThrow("Unsupported image file type: .txt");
    expect(readFile).not.toHaveBeenCalled();
  });

  it("maps jpeg and jpg files to image/jpeg", async () => {
    const buffer = Buffer.from("jpeg bytes");
    const readFile = vi.fn(async () => buffer);
    const inspectImage = vi.fn(() => ({
      width: 100,
      height: 200,
    }));

    await expect(
      readLocalImagePayload("/tmp/mock/first.jpeg", {
        readFile,
        inspectImage,
        now: () => fixedDate,
        randomId: () => "first-id",
      }),
    ).resolves.toMatchObject({
      fileName: "first.jpeg",
      mimeType: "image/jpeg",
    });

    await expect(
      readLocalImagePayload("/tmp/mock/second.jpg", {
        readFile,
        inspectImage,
        now: () => fixedDate,
        randomId: () => "second-id",
      }),
    ).resolves.toMatchObject({
      fileName: "second.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("allows inspectImage to override the inferred mime type", async () => {
    await expect(
      readLocalImagePayload("/tmp/mock/source.png", {
        readFile: vi.fn(async () => Buffer.from("webp bytes")),
        inspectImage: vi.fn(() => ({
          width: 640,
          height: 480,
          mimeType: "image/webp",
        })),
        now: () => fixedDate,
        randomId: () => "override-id",
      }),
    ).resolves.toMatchObject({
      fileName: "source.png",
      mimeType: "image/webp",
    });
  });
});
