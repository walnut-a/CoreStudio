import { MIME_TYPES } from "@excalidraw/common";

import { updateImageCache } from "../src/image";

import type {
  AppClassProperties,
  BinaryFileData,
  DataURL,
} from "@excalidraw/excalidraw/types";
import type { FileId } from "../src/types";

describe("updateImageCache", () => {
  const originalImage = globalThis.Image;
  let images: Array<HTMLImageElement & { src: string }> = [];

  const createFile = (id: FileId, dataURL: string): BinaryFileData => ({
    id,
    mimeType: MIME_TYPES.png,
    dataURL: dataURL as DataURL,
    created: 1,
  });

  beforeEach(() => {
    images = [];
    class FakeImage {
      onload: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      src = "";

      constructor() {
        images.push(this as unknown as HTMLImageElement & { src: string });
      }
    }
    globalThis.Image = FakeImage as unknown as typeof Image;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
  });

  it("keeps a newer image cache entry when an older load finishes later", async () => {
    const fileId = "file-1" as FileId;
    const imageCache: AppClassProperties["imageCache"] = new Map();

    const thumbnailLoad = updateImageCache({
      imageCache,
      fileIds: [fileId],
      files: {
        [fileId]: createFile(fileId, "data:image/png;base64,thumbnail"),
      },
    });
    const originalLoad = updateImageCache({
      imageCache,
      fileIds: [fileId],
      files: {
        [fileId]: createFile(fileId, "data:image/png;base64,original"),
      },
    });

    images[1].onload?.(new Event("load"));
    await originalLoad;
    expect(imageCache.get(fileId)?.image).toBe(images[1]);

    images[0].onload?.(new Event("load"));
    await thumbnailLoad;
    expect(imageCache.get(fileId)?.image).toBe(images[1]);
  });
});
