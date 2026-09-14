import { expect, it } from "vitest";
import { validateExternalImageHeader } from "./externalImageHeader";
it("rejects PNG dimensions exceeding the pixel budget before raster decoding", () => {
  const bytes = Buffer.alloc(40);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(100000, 16);
  bytes.writeUInt32BE(100000, 20);
  bytes.write("IEND", 32);
  expect(() => validateExternalImageHeader(bytes, "image/png")).toThrow("像素");
});
it("rejects incomplete WebP and JPEG containers", () => {
  const webp = Buffer.alloc(32);
  webp.write("RIFF");
  webp.writeUInt32LE(3000, 4);
  webp.write("WEBP", 8);
  expect(() => validateExternalImageHeader(webp, "image/webp")).toThrow("完整");
  expect(() =>
    validateExternalImageHeader(Buffer.from([255, 216, 255]), "image/jpeg"),
  ).toThrow("完整");
});
it("accepts a bounded PNG header for the later full decoder", () => {
  const bytes = Buffer.alloc(40);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(2400, 16);
  bytes.writeUInt32BE(1600, 20);
  bytes.write("IEND", 32);
  expect(() => validateExternalImageHeader(bytes, "image/png")).not.toThrow();
});

it.each([
  [
    "image/gif",
    (() => {
      const bytes = Buffer.alloc(14);
      bytes.write("GIF89a");
      bytes.writeUInt16LE(320, 6);
      bytes.writeUInt16LE(240, 8);
      bytes[13] = 0x3b;
      return bytes;
    })(),
    { width: 320, height: 240 },
  ],
  [
    "image/bmp",
    (() => {
      const bytes = Buffer.alloc(54);
      bytes.write("BM");
      bytes.writeUInt32LE(40, 14);
      bytes.writeInt32LE(640, 18);
      bytes.writeInt32LE(-480, 22);
      return bytes;
    })(),
    { width: 640, height: 480 },
  ],
  [
    "image/x-icon",
    (() => {
      const bytes = Buffer.alloc(22);
      bytes.writeUInt16LE(1, 2);
      bytes.writeUInt16LE(1, 4);
      bytes[6] = 64;
      bytes[7] = 32;
      return bytes;
    })(),
    { width: 64, height: 32 },
  ],
  [
    "image/avif",
    (() => {
      const bytes = Buffer.alloc(44);
      bytes.writeUInt32BE(20, 0);
      bytes.write("ftyp", 4);
      bytes.write("avif", 8);
      bytes.write("mif1", 16);
      bytes.writeUInt32BE(20, 20);
      bytes.write("ispe", 24);
      bytes.writeUInt32BE(800, 32);
      bytes.writeUInt32BE(600, 36);
      return bytes;
    })(),
    { width: 800, height: 600 },
  ],
])(
  "accepts %s through the unified image header contract",
  (mimeType, bytes, dimensions) => {
    expect(
      validateExternalImageHeader(bytes as Buffer, mimeType as string),
    ).toEqual(dimensions);
  },
);
