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

import { generateOpenRouterImages } from "./openrouter";

describe("generateOpenRouterImages", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("uses OpenRouter chat completions with image modalities and image_config", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              images: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${Buffer.from("openrouter image").toString("base64")}`,
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    const response = await generateOpenRouterImages({
      apiKey: "openrouter-key",
      request: {
        provider: "openrouter",
        model: "google/gemini-3.1-flash-image-preview",
        prompt: "一台极简桌面 CNC 的产品渲染图",
        width: 1280,
        height: 720,
        imageCount: 1,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer openrouter-key",
          "Content-Type": "application/json",
          "HTTP-Referer": "https://excalidraw-image-board.local",
          "X-Title": "CoreStudio Image Board",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [
            {
              role: "user",
              content: "一台极简桌面 CNC 的产品渲染图",
            },
          ],
          modalities: ["image", "text"],
          stream: false,
          image_config: {
            aspect_ratio: "16:9",
            image_size: "1K",
          },
        }),
      }),
    );
    expect(response.provider).toBe("openrouter");
    expect(response.images).toHaveLength(1);
  });

  it("passes reference images through OpenRouter multimodal message content", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              images: [
                {
                  imageUrl: {
                    url: `data:image/png;base64,${Buffer.from("openrouter edit image").toString("base64")}`,
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    await generateOpenRouterImages({
      apiKey: "openrouter-key",
      request: {
        provider: "openrouter",
        model: "google/gemini-2.5-flash-image",
        prompt: "基于参考继续细化",
        width: 1024,
        height: 1024,
        imageCount: 1,
        reference: {
          enabled: true,
          elementCount: 2,
          textCount: 1,
          textNotes: ["保留主体轮廓"],
          image: {
            mimeType: "image/png",
            dataBase64: Buffer.from("selection").toString("base64"),
          },
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "基于参考继续细化\n\n参考选区中的文字说明：\n1. 保留主体轮廓",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${Buffer.from("selection").toString("base64")}`,
                  },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
          stream: false,
          image_config: {
            aspect_ratio: "1:1",
            image_size: "1K",
          },
        }),
      }),
    );
  });
});
