// Cheap container checks run before allocating a raster in the isolated decoder.
const checkDimensions = (width: number, height: number) => {
  if (!width || !height || width * height > 64_000_000)
    throw new Error("图片尺寸无效或超过 6400 万像素限制。");
};
export const validateExternalImageHeader = (
  bytes: Buffer,
  mimeType: string,
) => {
  if (bytes.length > 64 * 1024 * 1024)
    throw new Error("图片超过 64 MiB 限制。");
  if (mimeType === "image/png") {
    if (
      bytes.length < 33 ||
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      bytes.toString("ascii", 12, 16) !== "IHDR" ||
      bytes.toString("ascii", bytes.length - 8, bytes.length - 4) !== "IEND"
    )
      throw new Error("PNG 文件不完整。");
    checkDimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    return;
  }
  if (mimeType === "image/jpeg") {
    if (
      bytes.length < 4 ||
      bytes.readUInt16BE(0) !== 0xffd8 ||
      bytes.readUInt16BE(bytes.length - 2) !== 0xffd9
    )
      throw new Error("JPEG 文件不完整。");
    let offset = 2;
    while (offset < bytes.length - 2) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker) &&
        length >= 8
      ) {
        checkDimensions(
          bytes.readUInt16BE(offset + 5),
          bytes.readUInt16BE(offset + 3),
        );
        return;
      }
      offset += length;
    }
    throw new Error("JPEG 尺寸头无效。");
  }
  if (mimeType === "image/webp") {
    if (
      bytes.length < 20 ||
      bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.toString("ascii", 8, 12) !== "WEBP" ||
      bytes.readUInt32LE(4) + 8 !== bytes.length
    )
      throw new Error("WebP 文件不完整。");
    for (let offset = 12; offset + 8 <= bytes.length; ) {
      const type = bytes.toString("ascii", offset, offset + 4),
        length = bytes.readUInt32LE(offset + 4),
        data = offset + 8;
      if (data + length > bytes.length) break;
      if (type === "VP8X" && length >= 10) {
        checkDimensions(
          bytes.readUIntLE(data + 4, 3) + 1,
          bytes.readUIntLE(data + 7, 3) + 1,
        );
        return;
      }
      if (type === "VP8L" && length >= 5 && bytes[data] === 0x2f) {
        const dimensions = bytes.readUInt32LE(data + 1);
        checkDimensions(
          (dimensions & 0x3fff) + 1,
          ((dimensions >>> 14) & 0x3fff) + 1,
        );
        return;
      }
      if (type === "VP8 " && length >= 10) {
        checkDimensions(
          bytes.readUInt16LE(data + 6) & 0x3fff,
          bytes.readUInt16LE(data + 8) & 0x3fff,
        );
        return;
      }
      offset = data + length + (length % 2);
    }
    throw new Error("WebP 尺寸头无效。");
  }
  if (mimeType !== "image/svg+xml") throw new Error("不支持的图片格式。");
};
