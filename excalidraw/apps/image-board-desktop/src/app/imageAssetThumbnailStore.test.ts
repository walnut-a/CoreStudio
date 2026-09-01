import { describe, expect, it, vi } from "vitest";

import { createImageAssetThumbnailStore } from "./imageAssetThumbnailStore";

const asset = (fileId: string, dataBase64: string) => ({
  fileId,
  mimeType: "image/png",
  dataBase64,
  width: 320,
  height: 213,
  createdAt: "2026-04-12T08:00:00.000Z",
  rendition: "thumbnail" as const,
});

describe("image asset thumbnail store", () => {
  it("replaces initial thumbnails and merges later visible batches", () => {
    const store = createImageAssetThumbnailStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.replace("/project-a", [asset("initial", "aW5pdGlhbA==")]);
    store.merge("/project-a", [asset("visible", "dmlzaWJsZQ==")]);

    expect(store.getSnapshot()).toEqual({
      projectPath: "/project-a",
      dataUrls: {
        initial: "data:image/png;base64,aW5pdGlhbA==",
        visible: "data:image/png;base64,dmlzaWJsZQ==",
      },
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("drops thumbnails when the active project changes", () => {
    const store = createImageAssetThumbnailStore();
    store.replace("/project-a", [asset("initial", "aW5pdGlhbA==")]);

    store.reset("/project-b");

    expect(store.getSnapshot()).toEqual({
      projectPath: "/project-b",
      dataUrls: {},
    });
  });
});
