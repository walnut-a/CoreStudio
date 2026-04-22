import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("electron", () => ({
  nativeImage: {
    createFromBuffer: vi.fn(() => ({
      getSize: () => ({
        width: 1024,
        height: 1024,
      }),
    })),
  },
}));

vi.stubGlobal("fetch", fetchMock);

import { generateFalImages } from "./fal";

describe("generateFalImages", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("uses the Nano Banana schema for fal-ai/nano-banana-2", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [
            {
              url: "https://example.com/output.png",
              content_type: "image/png",
            },
          ],
          seed: 7,
        }),
      })
      .mockResolvedValueOnce({
        arrayBuffer: async () => Buffer.from("banana image"),
      });

    const response = await generateFalImages({
      apiKey: "test-key",
      request: {
        provider: "fal",
        model: "fal-ai/nano-banana-2",
        prompt: "一个工业设计海报",
        width: 1024,
        height: 1024,
        seed: 7,
        imageCount: 2,
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://fal.run/fal-ai/nano-banana-2",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          prompt: "一个工业设计海报",
          num_images: 2,
          aspect_ratio: "1:1",
          resolution: "1K",
          output_format: "png",
          seed: 7,
        }),
      }),
    );
    expect(response.images).toHaveLength(1);
    expect(response.seed).toBe(7);
  });

  it("omits Nano Banana ratio controls when ratio is automatic", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [
            {
              url: "https://example.com/output.png",
              content_type: "image/png",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        arrayBuffer: async () => Buffer.from("banana auto image"),
      });

    await generateFalImages({
      apiKey: "test-key",
      request: {
        provider: "fal",
        model: "fal-ai/nano-banana-2",
        prompt: "一个工业设计海报",
        aspectRatio: null,
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://fal.run/fal-ai/nano-banana-2",
      expect.objectContaining({
        body: JSON.stringify({
          prompt: "一个工业设计海报",
          num_images: 1,
          output_format: "png",
        }),
      }),
    );
  });

  it("switches Nano Banana to the edit endpoint when a reference image is provided", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [
            {
              url: "https://example.com/output.png",
              content_type: "image/png",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        arrayBuffer: async () => Buffer.from("banana image"),
      });

    await generateFalImages({
      apiKey: "test-key",
      request: {
        provider: "fal",
        model: "fal-ai/nano-banana-2",
        prompt: "基于当前参考继续细化",
        width: 1024,
        height: 1024,
        imageCount: 1,
        reference: {
          enabled: true,
          elementCount: 3,
          textCount: 1,
          textNotes: ["保留圈出的按键布局"],
          image: {
            mimeType: "image/png",
            dataBase64: Buffer.from("selection").toString("base64"),
          },
        },
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://fal.run/fal-ai/nano-banana-2/edit",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          prompt: "基于当前参考继续细化\n\n参考选区中的文字说明：\n1. 保留圈出的按键布局",
          num_images: 1,
          aspect_ratio: "1:1",
          resolution: "1K",
          output_format: "png",
          image_urls: [
            `data:image/png;base64,${Buffer.from("selection").toString("base64")}`,
          ],
        }),
      }),
    );
  });

  it("keeps FLUX models on the existing schema", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [
            {
              url: "https://example.com/output.png",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        arrayBuffer: async () => Buffer.from("flux image"),
      });

    await generateFalImages({
      apiKey: "test-key",
      request: {
        provider: "fal",
        model: "fal-ai/flux/schnell",
        prompt: "一个工业设计海报",
        width: 1280,
        height: 720,
        imageCount: 3,
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://fal.run/fal-ai/flux/schnell",
      expect.objectContaining({
        body: JSON.stringify({
          prompt: "一个工业设计海报",
          image_size: {
            width: 1280,
            height: 720,
          },
          num_images: 3,
        }),
      }),
    );
  });
});
