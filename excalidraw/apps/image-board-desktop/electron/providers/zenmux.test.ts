import { beforeEach, describe, expect, it, vi } from "vitest";

const { createFromBuffer, generateContent, googleGenAI } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const createFromBuffer = vi.fn(() => ({
    getSize: () => ({
      width: 1024,
      height: 1024,
    }),
    toPNG: () => Buffer.from("normalized-image"),
  }));
  const googleGenAI = vi.fn(() => ({
    models: {
      generateContent,
    },
  }));
  return {
    createFromBuffer,
    generateContent,
    googleGenAI,
  };
});

vi.mock("electron", () => ({
  nativeImage: {
    createFromBuffer,
  },
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: googleGenAI,
}));

import { generateZenMuxImages } from "./zenmux";

describe("generateZenMuxImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the ZenMux Vertex AI endpoint for Google image models", async () => {
    generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: Buffer.from("zenmux image").toString("base64"),
                },
              },
            ],
          },
        },
      ],
      get text() {
        return "我只能先返回文字说明";
      },
    });

    const response = await generateZenMuxImages({
      apiKey: "sk-ai-v1-test",
      request: {
        provider: "zenmux",
        model: "google/gemini-2.5-flash-image",
        prompt: "工业设计渲染图",
        width: 1280,
        height: 720,
        imageCount: 1,
      },
    });

    expect(googleGenAI).toHaveBeenCalledWith({
      apiKey: "sk-ai-v1-test",
      vertexai: true,
      httpOptions: {
        baseUrl: "https://zenmux.ai/api/vertex-ai",
        apiVersion: "v1",
      },
    });
    expect(generateContent).toHaveBeenCalledWith({
      model: "google/gemini-2.5-flash-image",
      contents: "工业设计渲染图",
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });
    expect(response.provider).toBe("zenmux");
    expect(response.images).toHaveLength(1);
  });

  it("passes reference images and selected text notes through the Vertex API schema", async () => {
    generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: Buffer.from("zenmux image").toString("base64"),
                },
              },
            ],
          },
        },
      ],
    });

    await generateZenMuxImages({
      apiKey: "sk-ai-v1-test",
      request: {
        provider: "zenmux",
        model: "google/gemini-2.5-flash-image",
        prompt: "根据参考继续出图",
        width: 1024,
        height: 1024,
        imageCount: 1,
        reference: {
          enabled: true,
          elementCount: 2,
          textCount: 2,
          textNotes: ["保持整体轮廓", "圈出的面板再薄一点"],
          image: {
            mimeType: "image/png",
            dataBase64: Buffer.from("selection").toString("base64"),
          },
        },
      },
    });

    expect(generateContent).toHaveBeenCalledWith({
      model: "google/gemini-2.5-flash-image",
      contents: [
        {
          text:
            "根据参考继续出图\n\n参考选区中的文字说明：\n1. 保持整体轮廓\n2. 圈出的面板再薄一点",
        },
        {
          inlineData: {
            mimeType: "image/png",
            data: Buffer.from("selection").toString("base64"),
          },
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });
  });

  it("re-encodes generated reference images before upload", async () => {
    generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: Buffer.from("zenmux image").toString("base64"),
                },
              },
            ],
          },
        },
      ],
    });

    await generateZenMuxImages({
      apiKey: "sk-ai-v1-test",
      request: {
        provider: "zenmux",
        model: "google/gemini-3-pro-image-preview",
        prompt: "根据参考继续出图",
        width: 1024,
        height: 1024,
        imageCount: 1,
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
          image: {
            mimeType: "image/png",
            dataBase64: Buffer.from("selection").toString("base64"),
          },
          debug: {
            sourceType: "generated",
            sourceProvider: "zenmux",
            sourceModel: "google/gemini-3-pro-image-preview",
          },
        },
      },
    });

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { text: "根据参考继续出图" },
          {
            inlineData: {
              mimeType: "image/png",
              data: Buffer.from("normalized-image").toString("base64"),
            },
          },
        ],
      }),
    );
  });

  it("falls back to response.data when the SDK exposes image bytes through the getter", async () => {
    generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: "图片已生成",
              },
            ],
          },
        },
      ],
      get data() {
        return Buffer.from("getter image").toString("base64");
      },
    });

    const response = await generateZenMuxImages({
      apiKey: "sk-ai-v1-test",
      request: {
        provider: "zenmux",
        model: "google/gemini-3-pro-image-preview",
        prompt: "工业设计渲染图",
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    expect(response.images).toHaveLength(1);
    expect(response.images[0]).toMatchObject({
      mimeType: "image/png",
      width: 1024,
      height: 1024,
    });
  });

  it("throws a response summary when no image bytes are returned", async () => {
    generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: "我只能先返回文字说明",
              },
            ],
          },
          finishReason: "STOP",
          finishMessage: "model returned text only",
          safetyRatings: [
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              probability: "NEGLIGIBLE",
              blocked: false,
            },
          ],
        },
      ],
    });

    await expect(
      generateZenMuxImages({
        apiKey: "sk-ai-v1-test",
        request: {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "工业设计渲染图",
          width: 1024,
          height: 1024,
          imageCount: 1,
        },
      }),
    ).rejects.toThrow(/模型没有返回图片/);

    await expect(
      generateZenMuxImages({
        apiKey: "sk-ai-v1-test",
        request: {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "工业设计渲染图",
          width: 1024,
          height: 1024,
          imageCount: 1,
        },
      }),
    ).rejects.toThrow(/文本摘要：我只能先返回文字说明/);

    await expect(
      generateZenMuxImages({
        apiKey: "sk-ai-v1-test",
        request: {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "工业设计渲染图",
          width: 1024,
          height: 1024,
          imageCount: 1,
        },
      }),
    ).rejects.toThrow(/finishReason：STOP/);

    await expect(
      generateZenMuxImages({
        apiKey: "sk-ai-v1-test",
        request: {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "工业设计渲染图",
          width: 1024,
          height: 1024,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("selection").toString("base64"),
            },
            debug: {
              fileId: "file-1",
              sourceType: "generated",
              sourceProvider: "zenmux",
              sourceModel: "google/gemini-3-pro-image-preview",
              parentFileId: "file-0",
            },
          },
        },
      }),
    ).rejects.toThrow(/请求摘要：provider=zenmux/);

    await expect(
      generateZenMuxImages({
        apiKey: "sk-ai-v1-test",
        request: {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "工业设计渲染图",
          width: 1024,
          height: 1024,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("selection").toString("base64"),
            },
            debug: {
              fileId: "file-1",
              sourceType: "generated",
              sourceProvider: "zenmux",
              sourceModel: "google/gemini-3-pro-image-preview",
              parentFileId: "file-0",
            },
          },
        },
      }),
    ).rejects.toThrow(/内容=text\+inlineData/);

    await expect(
      generateZenMuxImages({
        apiKey: "sk-ai-v1-test",
        request: {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "工业设计渲染图",
          width: 1024,
          height: 1024,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("selection").toString("base64"),
            },
            debug: {
              fileId: "file-1",
              sourceType: "generated",
              sourceProvider: "zenmux",
              sourceModel: "google/gemini-3-pro-image-preview",
              parentFileId: "file-0",
            },
          },
        },
      }),
    ).rejects.toThrow(/引用图片=image\/png\/1024x1024/);

    await expect(
      generateZenMuxImages({
        apiKey: "sk-ai-v1-test",
        request: {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "工业设计渲染图",
          width: 1024,
          height: 1024,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("selection").toString("base64"),
            },
            debug: {
              fileId: "file-1",
              sourceType: "generated",
              sourceProvider: "zenmux",
              sourceModel: "google/gemini-3-pro-image-preview",
              parentFileId: "file-0",
            },
          },
        },
      }),
    ).rejects.toThrow(/请求载荷：/);

    await expect(
      generateZenMuxImages({
        apiKey: "sk-ai-v1-test",
        request: {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "工业设计渲染图",
          width: 1024,
          height: 1024,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("selection").toString("base64"),
            },
            debug: {
              fileId: "file-1",
              sourceType: "generated",
              sourceProvider: "zenmux",
              sourceModel: "google/gemini-3-pro-image-preview",
              parentFileId: "file-0",
            },
          },
        },
      }),
    ).rejects.toThrow(/"base64Prefix":/);

    await expect(
      generateZenMuxImages({
        apiKey: "sk-ai-v1-test",
        request: {
          provider: "zenmux",
          model: "google/gemini-3-pro-image-preview",
          prompt: "工业设计渲染图",
          width: 1024,
          height: 1024,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("selection").toString("base64"),
            },
            debug: {
              fileId: "file-1",
              sourceType: "generated",
              sourceProvider: "zenmux",
              sourceModel: "google/gemini-3-pro-image-preview",
              parentFileId: "file-0",
            },
          },
        },
      }),
    ).rejects.toThrow(
      /引用来源=generated\/zenmux\/google\/gemini-3-pro-image-preview\/parent=file-0/,
    );
  });
});
