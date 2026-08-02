import { describe, expect, it, vi } from "vitest";

import {
  buildProjectClipboardPayload,
  writeProjectElementsToClipboard,
} from "./projectClipboard";

const imageElement = {
  id: "element-1",
  type: "image",
  fileId: "file-1",
  version: 1,
  versionNonce: 2,
  isDeleted: false,
};

describe("projectClipboard", () => {
  it("serializes original project assets instead of renderer thumbnails", async () => {
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(
        async (input: { rendition: "original" | "thumbnail" }) => [
          {
            fileId: "file-1",
            mimeType: "image/png",
            dataBase64:
              input.rendition === "thumbnail"
                ? "dGh1bWJuYWls"
                : "b3JpZ2luYWwtcGl4ZWxz",
            width: input.rendition === "thumbnail" ? 320 : 2400,
            height: input.rendition === "thumbnail" ? 213 : 1600,
            createdAt: "2026-08-02T01:00:00.000Z",
            rendition: input.rendition,
          },
        ],
      );
    const writeClipboard = vi.fn();

    await writeProjectElementsToClipboard({
      projectPath: "/projects/source",
      elements: [imageElement],
      readProjectAssetPayloads,
      writeClipboard,
    });

    expect(readProjectAssetPayloads).toHaveBeenCalledWith({
      projectPath: "/projects/source",
      fileIds: ["file-1"],
      rendition: "original",
    });
    expect(readProjectAssetPayloads).toHaveBeenCalledWith({
      projectPath: "/projects/source",
      fileIds: ["file-1"],
      rendition: "thumbnail",
    });
    expect(writeClipboard).toHaveBeenCalledWith({
      text: expect.any(String),
      previewImageDataUrl: "data:image/png;base64,dGh1bWJuYWls",
    });
    const payload = JSON.parse(writeClipboard.mock.calls[0][0].text);
    expect(payload).toEqual(
      expect.objectContaining({
        type: "excalidraw/clipboard",
        elements: [imageElement],
        files: {
          "file-1": expect.objectContaining({
            id: "file-1",
            mimeType: "image/png",
            dataURL: "data:image/png;base64,b3JpZ2luYWwtcGl4ZWxz",
          }),
        },
      }),
    );
  });

  it("fails closed when a selected image has no readable original asset", () => {
    expect(() =>
      buildProjectClipboardPayload({
        elements: [imageElement],
        assets: [],
      }),
    ).toThrow("file-1");
  });
});
