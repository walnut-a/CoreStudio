import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateOpenAIImages } from "./openai";

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

describe("generateOpenAIImages", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("uses the official OpenAI image generations endpoint", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("openai image").toString("base64"),
          },
        ],
      }),
    });

    const response = await generateOpenAIImages({
      apiKey: "openai-key",
      request: {
        provider: "openai",
        model: "gpt-image-1.5",
        prompt: "一台极简桌面 CNC 的产品渲染图",
        width: 1536,
        height: 1024,
        imageCount: 2,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer openai-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1.5",
          prompt: "一台极简桌面 CNC 的产品渲染图",
          size: "1536x1024",
          output_format: "png",
          n: 2,
        }),
      }),
    );
    expect(response.provider).toBe("openai");
    expect(response.images).toHaveLength(1);
  });

  it("sends OpenAI automatic size when no ratio is selected", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("openai auto image").toString("base64"),
          },
        ],
      }),
    });

    await generateOpenAIImages({
      apiKey: "openai-key",
      request: {
        provider: "openai",
        model: "gpt-image-2",
        prompt: "一张横版产品发布海报",
        aspectRatio: null,
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/images/generations",
      expect.objectContaining({
        body: JSON.stringify({
          model: "gpt-image-2",
          prompt: "一张横版产品发布海报",
          size: "auto",
          output_format: "png",
        }),
      }),
    );
  });

  it("uses the official OpenAI image edits endpoint when a reference image is provided", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("openai edit image").toString("base64"),
          },
        ],
      }),
    });

    await generateOpenAIImages({
      apiKey: "openai-key",
      request: {
        provider: "openai",
        model: "gpt-image-1",
        prompt: "基于参考继续细化",
        width: 1024,
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

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.openai.com/v1/images/edits",
    );
    expect(requestInit).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer openai-key",
      },
    });
    expect(requestInit.headers).not.toHaveProperty("Content-Type");

    const body = requestInit.body as FormData;
    expect(body.get("model")).toBe("gpt-image-1");
    expect(body.get("prompt")).toBe(
      "基于参考继续细化\n\n参考选区中的文字说明：\n1. 保留主体轮廓",
    );
    expect(body.get("size")).toBe("1024x1536");
    expect(body.get("output_format")).toBe("png");
    expect(body.get("image")).toBeInstanceOf(Blob);
  });

  it("sends inline prompt references as image[] in prompt order", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            b64_json: Buffer.from("openai multi edit image").toString("base64"),
          },
        ],
      }),
    });

    await generateOpenAIImages({
      apiKey: "openai-key",
      request: {
        provider: "openai",
        model: "gpt-image-2",
        prompt: "结构看 ，材质看 ",
        promptParts: [
          { type: "text", text: "结构看 " },
          { type: "reference", referenceId: "shape-ref" },
          { type: "text", text: "，材质看 " },
          { type: "reference", referenceId: "material-ref" },
        ],
        promptReferences: [
          {
            id: "material-ref",
            label: "图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("material").toString("base64"),
            },
          },
          {
            id: "shape-ref",
            label: "图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("shape").toString("base64"),
            },
          },
        ],
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const body = requestInit.body as FormData;
    expect(body.get("prompt")).toBe("结构看 参考图 1，材质看 参考图 2");
    expect(body.get("image")).toBeNull();
    expect(body.getAll("image[]")).toHaveLength(2);
    expect(body.getAll("image[]")[0]).toBeInstanceOf(Blob);
    expect(body.getAll("image[]")[1]).toBeInstanceOf(Blob);
  });
});
