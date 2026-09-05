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
