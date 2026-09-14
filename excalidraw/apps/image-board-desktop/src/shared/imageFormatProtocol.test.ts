import { IMAGE_MIME_TYPES } from "@excalidraw/common";
import { describe, expect, it } from "vitest";

import {
  IMAGE_FILE_EXTENSIONS,
  IMAGE_INPUT_MIME_TYPES,
  IMAGE_MIME_TYPE_BY_EXTENSION,
} from "./imageFormatProtocol";

describe("CoreStudio image format protocol", () => {
  it("defines one extension and MIME contract for every desktop ingress", () => {
    expect(IMAGE_FILE_EXTENSIONS).toEqual([
      "png",
      "jpg",
      "jpeg",
      "jfif",
      "webp",
      "avif",
      "gif",
      "bmp",
      "ico",
      "svg",
    ]);
    expect(IMAGE_MIME_TYPE_BY_EXTENSION).toEqual({
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      jfif: "image/jpeg",
      webp: "image/webp",
      avif: "image/avif",
      gif: "image/gif",
      bmp: "image/bmp",
      ico: "image/x-icon",
      svg: "image/svg+xml",
    });
  });

  it("stays compatible with the unmodified upstream canvas whitelist", () => {
    const canvasExtensions = Object.keys(IMAGE_MIME_TYPES).sort();
    const protocolCanvasExtensions = IMAGE_FILE_EXTENSIONS.filter(
      (extension) => extension !== "jpeg",
    ).sort();

    expect(protocolCanvasExtensions).toEqual(canvasExtensions);
    expect(new Set(IMAGE_INPUT_MIME_TYPES)).toEqual(
      new Set(Object.values(IMAGE_MIME_TYPES)),
    );
  });
});
