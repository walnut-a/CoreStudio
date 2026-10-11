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
