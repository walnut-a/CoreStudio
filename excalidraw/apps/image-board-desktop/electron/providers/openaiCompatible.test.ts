import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateOpenAIImages } from "./openai";

const fetchMock = vi.fn();

vi.mock("electron", () => ({
  nativeImage: {
    createFromBuffer: vi.fn(() => ({
      getSize: () => ({ width: 1024, height: 1024 }),
      toPNG: () => Buffer.from("normalized-image"),
    })),
  },
}));

vi.stubGlobal("fetch", fetchMock);

const okResponse = () => ({
  ok: true,
  json: async () => ({
    data: [{ b64_json: Buffer.from("compatible image").toString("base64") }],
  }),
});

describe("OpenAI 兼容图像服务", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(okResponse());
  });

  it("使用配置的 Base URL 发起生成请求", async () => {
    const response = await generateOpenAIImages({
      apiKey: "compatible-key",
      baseUrl: "https://images.example.com/v1/",
      responseProvider: "openai-compatible",
      providerLabel: "示例服务",
      request: {
        provider: "openai-compatible",
        model: "vendor/image-model",
        prompt: "生成一台桌面 CNC",
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://images.example.com/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer compatible-key",
          "Content-Type": "application/json",
        },
      }),
    );
    expect(response.provider).toBe("openai-compatible");
  });

  it("有参考图时使用兼容服务的 edits 地址", async () => {
    await generateOpenAIImages({
      apiKey: "compatible-key",
      baseUrl: "https://images.example.com/v1",
      responseProvider: "openai-compatible",
      providerLabel: "示例服务",
      request: {
        provider: "openai-compatible",
        model: "vendor/edit-model",
        prompt: "继续细化",
        width: 1024,
        height: 1024,
        imageCount: 1,
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
          image: {
            mimeType: "image/png",
            dataBase64: Buffer.from("reference").toString("base64"),
          },
        },
      },
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://images.example.com/v1/images/edits",
    );
  });
});
