import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("electron", () => ({
  nativeImage: {
    createFromBuffer: vi.fn(() => ({
      getSize: () => ({
        width: 1024,
        height: 1024,
      }),
      toPNG: () => Buffer.from("normalized-image"),
    })),
  },
}));

vi.stubGlobal("fetch", fetchMock);

import { generateJimengImages } from "./jimeng";

describe("generateJimengImages", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("uses the Ark image generation schema for Seedream 5.0 Lite", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("seedream image").toString("base64"),
            size: "2048x2048",
          },
        ],
      }),
    });

    const response = await generateJimengImages({
      apiKey: "ark-key",
      request: {
        provider: "jimeng",
        model: "doubao-seedream-5-0-lite-260128",
        prompt: "一台极简桌面 CNC 的产品渲染图",
        width: 2048,
        height: 2048,
        imageCount: 1,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ark.cn-beijing.volces.com/api/v3/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer ark-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "doubao-seedream-5-0-lite-260128",
          prompt: "一台极简桌面 CNC 的产品渲染图",
          size: "2048x2048",
          response_format: "b64_json",
          watermark: false,
          sequential_image_generation: "disabled",
        }),
      }),
    );
    expect(response.provider).toBe("jimeng");
    expect(response.images).toHaveLength(1);
  });

  it("omits sequential image generation for Seedream 5.0 Pro", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("seedream pro image").toString("base64"),
          },
        ],
      }),
    });

    await generateJimengImages({
      apiKey: "ark-key",
      request: {
        provider: "jimeng",
        model: "doubao-seedream-5-0-pro-260628",
        prompt: "一颗白色陶瓷球",
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody).not.toHaveProperty("sequential_image_generation");
  });

  it("passes reference image data through the supported Seedream image field", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("seedream edit image").toString("base64"),
          },
        ],
      }),
    });

    await generateJimengImages({
      apiKey: "ark-key",
      request: {
        provider: "jimeng",
        model: "doubao-seedream-4-0-250828",
        prompt: "基于参考继续细化",
        width: 2048,
        height: 1536,
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
          model: "doubao-seedream-4-0-250828",
          prompt: "基于参考继续细化\n\n参考选区中的文字说明：\n1. 保留主体轮廓",
          size: "2048x1536",
          response_format: "b64_json",
          watermark: false,
          sequential_image_generation: "disabled",
          image: `data:image/png;base64,${Buffer.from("selection").toString(
            "base64",
          )}`,
        }),
      }),
    );
  });

  it("passes ordered reference images to Seedream 5.0 as an image array", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("seedream multi reference image").toString(
              "base64",
            ),
          },
        ],
      }),
    });

    await generateJimengImages({
      apiKey: "ark-key",
      request: {
        provider: "jimeng",
        model: "doubao-seedream-5-0-pro-260628",
        prompt: "结合两张参考图生成产品渲染",
        promptParts: [{ type: "text", text: "结合两张参考图生成产品渲染" }],
        promptReferences: [
          {
            id: "reference-1",
            label: "参考图 1",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("reference-one").toString("base64"),
            },
          },
          {
            id: "reference-2",
            label: "参考图 2",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/jpeg",
              dataBase64: Buffer.from("reference-two").toString("base64"),
            },
          },
        ],
        width: 2048,
        height: 2048,
        imageCount: 1,
      },
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody).toMatchObject({
      model: "doubao-seedream-5-0-pro-260628",
      image: [
        `data:image/png;base64,${Buffer.from("reference-one").toString(
          "base64",
        )}`,
        `data:image/jpeg;base64,${Buffer.from("reference-two").toString(
          "base64",
        )}`,
      ],
    });
    expect(requestBody).not.toHaveProperty("sequential_image_generation");
  });

  it("keeps Seedream 3.0 T2I on text-only seed parameters", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("seedream t2i image").toString("base64"),
          },
        ],
      }),
    });

    await generateJimengImages({
      apiKey: "ark-key",
      request: {
        provider: "jimeng",
        model: "doubao-seedream-3-0-t2i-250415",
        prompt: "一个消费电子产品概念图",
        width: 1024,
        height: 1024,
        seed: 77,
        imageCount: 1,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          model: "doubao-seedream-3-0-t2i-250415",
          prompt: "一个消费电子产品概念图",
          size: "1024x1024",
          response_format: "b64_json",
          watermark: false,
          seed: 77,
        }),
      }),
    );
  });
});
