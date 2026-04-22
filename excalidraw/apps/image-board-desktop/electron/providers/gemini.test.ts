import { beforeEach, describe, expect, it, vi } from "vitest";

const { createFromBuffer, generateContent, generateImages } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const generateImages = vi.fn();
  const createFromBuffer = vi.fn(() => ({
    getSize: () => ({
      width: 1024,
      height: 1024,
    }),
    toPNG: () => Buffer.from("normalized-image"),
  }));

  return {
    createFromBuffer,
    generateContent,
    generateImages,
  };
});

vi.mock("electron", () => ({
  nativeImage: {
    createFromBuffer,
  },
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent,
      generateImages,
    },
  })),
}));

import { generateGeminiImages } from "./gemini";

describe("generateGeminiImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses generateContent for Gemini native image models", async () => {
    generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                text: "这里是图片",
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: Buffer.from("native image").toString("base64"),
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

    const response = await generateGeminiImages({
      apiKey: "test-key",
      request: {
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        prompt: "一张工业设计草图",
        width: 1024,
        height: 1024,
        imageCount: 4,
      },
    });

    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-2.5-flash-image",
      contents: "一张工业设计草图",
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });
    expect(generateImages).not.toHaveBeenCalled();
    expect(response.images).toHaveLength(1);
    expect(response.images[0]).toMatchObject({
      mimeType: "image/png",
      width: 1024,
      height: 1024,
    });
  });

  it("omits Gemini aspect ratio when the request is automatic", async () => {
    generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: Buffer.from("native image").toString("base64"),
                },
              },
            ],
          },
        },
      ],
    });

    await generateGeminiImages({
      apiKey: "test-key",
      request: {
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        prompt: "横版产品海报",
        aspectRatio: null,
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-2.5-flash-image",
      contents: "横版产品海报",
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });
  });

  it("sends the selected reference image and text notes to Gemini native image models", async () => {
    generateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: Buffer.from("native image").toString("base64"),
                },
              },
            ],
          },
        },
      ],
    });

    await generateGeminiImages({
      apiKey: "test-key",
      request: {
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        prompt: "继续细化工业设计方案",
        width: 1024,
        height: 1024,
        imageCount: 1,
        reference: {
          enabled: true,
          elementCount: 2,
          textCount: 1,
          textNotes: ["把圈出的按键做得更薄"],
          image: {
            mimeType: "image/png",
            dataBase64: Buffer.from("selection").toString("base64"),
          },
        },
      },
    });

    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          text: "继续细化工业设计方案\n\n参考选区中的文字说明：\n1. 把圈出的按键做得更薄",
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
                  data: Buffer.from("native image").toString("base64"),
                },
              },
            ],
          },
        },
      ],
    });

    await generateGeminiImages({
      apiKey: "test-key",
      request: {
        provider: "gemini",
        model: "gemini-3-pro-image-preview",
        prompt: "继续细化工业设计方案",
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
            sourceProvider: "gemini",
            sourceModel: "gemini-3-pro-image-preview",
          },
        },
      },
    });

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: [
          { text: "继续细化工业设计方案" },
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

    const response = await generateGeminiImages({
      apiKey: "test-key",
      request: {
        provider: "gemini",
        model: "gemini-3-pro-image-preview",
        prompt: "一张工业设计草图",
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
      generateGeminiImages({
        apiKey: "test-key",
        request: {
          provider: "gemini",
          model: "gemini-3-pro-image-preview",
          prompt: "一张工业设计草图",
          width: 1024,
          height: 1024,
          imageCount: 1,
        },
      }),
    ).rejects.toThrow(/模型没有返回图片/);

    await expect(
      generateGeminiImages({
        apiKey: "test-key",
        request: {
          provider: "gemini",
          model: "gemini-3-pro-image-preview",
          prompt: "一张工业设计草图",
          width: 1024,
          height: 1024,
          imageCount: 1,
        },
      }),
    ).rejects.toThrow(/文本摘要：我只能先返回文字说明/);

    await expect(
      generateGeminiImages({
        apiKey: "test-key",
        request: {
          provider: "gemini",
          model: "gemini-3-pro-image-preview",
          prompt: "一张工业设计草图",
          width: 1024,
          height: 1024,
          imageCount: 1,
        },
      }),
    ).rejects.toThrow(/finishReason：STOP/);

    await expect(
      generateGeminiImages({
        apiKey: "test-key",
        request: {
          provider: "gemini",
          model: "gemini-3-pro-image-preview",
          prompt: "一张工业设计草图",
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
              sourceProvider: "gemini",
              sourceModel: "gemini-3-pro-image-preview",
              parentFileId: "file-0",
            },
          },
        },
      }),
    ).rejects.toThrow(/请求摘要：provider=gemini/);

    await expect(
      generateGeminiImages({
        apiKey: "test-key",
        request: {
          provider: "gemini",
          model: "gemini-3-pro-image-preview",
          prompt: "一张工业设计草图",
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
              sourceProvider: "gemini",
              sourceModel: "gemini-3-pro-image-preview",
              parentFileId: "file-0",
            },
          },
        },
      }),
    ).rejects.toThrow(
      /引用来源=generated\/gemini\/gemini-3-pro-image-preview\/parent=file-0/,
    );
  });

  it("keeps Imagen models on the generateImages API", async () => {
    generateImages.mockResolvedValue({
      generatedImages: [
        {
          image: {
            imageBytes: Buffer.from("imagen image").toString("base64"),
          },
        },
      ],
    });

    await generateGeminiImages({
      apiKey: "test-key",
      request: {
        provider: "gemini",
        model: "imagen-4.0-fast-generate-001",
        prompt: "一张工业设计草图",
        width: 1280,
        height: 720,
        imageCount: 2,
      },
    });

    expect(generateImages).toHaveBeenCalledWith({
      model: "imagen-4.0-fast-generate-001",
      prompt: "一张工业设计草图",
      config: {
        numberOfImages: 2,
        aspectRatio: "16:9",
      },
    });
    expect(generateContent).not.toHaveBeenCalled();
  });
});
