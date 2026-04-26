import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFromBuffer,
  editImage,
  generateContent,
  generateImages,
  googleGenAI,
} = vi.hoisted(() => {
  const generateContent = vi.fn();
  const generateImages = vi.fn();
  const editImage = vi.fn();
  const createFromBuffer = vi.fn(() => ({
    getSize: () => ({
      width: 1024,
      height: 1024,
    }),
    toPNG: () => Buffer.from("normalized-image"),
  }));
  const googleGenAI = vi.fn(() => ({
    models: {
      editImage,
      generateContent,
      generateImages,
    },
  }));
  return {
    createFromBuffer,
    editImage,
    generateContent,
    generateImages,
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

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { generateZenMuxImages } from "./zenmux";

describe("generateZenMuxImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editImage.mockReset();
    fetchMock.mockReset();
    generateContent.mockReset();
    generateImages.mockReset();
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

  it("uses ZenMux Vertex AI image generation for GPT image models", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        predictions: [
          {
            bytesBase64Encoded:
              Buffer.from("zenmux gpt image").toString("base64"),
            mimeType: "image/png",
          },
        ],
      }),
    });

    const response = await generateZenMuxImages({
      apiKey: "sk-ai-v1-test",
      request: {
        provider: "zenmux",
        model: "openai/gpt-image-2",
        prompt: "一把折刀的工业设计渲染图",
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    expect(googleGenAI).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://zenmux.ai/api/vertex-ai/v1/publishers/openai/models/gpt-image-2:predict",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer sk-ai-v1-test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: "一把折刀的工业设计渲染图",
            },
          ],
          parameters: {
            sampleCount: 1,
            sampleImageSize: "1024x1024",
            outputOptions: {
              mimeType: "image/png",
            },
          },
        }),
      }),
    );
    expect(response.provider).toBe("zenmux");
    expect(response.model).toBe("openai/gpt-image-2");
    expect(response.images).toHaveLength(1);
  });

  it("omits ZenMux GPT image size controls when ratio is automatic", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        predictions: [
          {
            bytesBase64Encoded:
              Buffer.from("zenmux auto gpt image").toString("base64"),
            mimeType: "image/png",
          },
        ],
      }),
    });

    await generateZenMuxImages({
      apiKey: "sk-ai-v1-test",
      request: {
        provider: "zenmux",
        model: "openai/gpt-image-2",
        prompt: "一张横版产品发布海报",
        aspectRatio: null,
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://zenmux.ai/api/vertex-ai/v1/publishers/openai/models/gpt-image-2:predict",
      expect.objectContaining({
        body: JSON.stringify({
          instances: [
            {
              prompt: "一张横版产品发布海报",
            },
          ],
          parameters: {
            sampleCount: 1,
            outputOptions: {
              mimeType: "image/png",
            },
          },
        }),
      }),
    );
  });

  it("uses the saved adapter for custom ZenMux models", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        predictions: [
          {
            bytesBase64Encoded: Buffer.from("zenmux custom gpt image").toString(
              "base64",
            ),
            mimeType: "image/png",
          },
        ],
      }),
    });

    await generateZenMuxImages({
      apiKey: "sk-ai-v1-test",
      customModels: [
        {
          id: "vendor/custom-gpt-image",
          label: "vendor/custom-gpt-image",
          capabilityTemplate: "image-editing-aspect-ratio",
          adapter: "zenmux-vertex-gpt-image",
        },
      ],
      request: {
        provider: "zenmux",
        model: "vendor/custom-gpt-image",
        prompt: "一把折刀的工业设计渲染图",
        width: 1024,
        height: 1024,
        imageCount: 1,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://zenmux.ai/api/vertex-ai/v1/publishers/vendor/models/custom-gpt-image:predict",
      expect.objectContaining({
        body: expect.stringContaining('"sampleImageSize":"1024x1024"'),
      }),
    );
  });

  it("passes references to ZenMux GPT image models through Vertex AI predict", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        predictions: [
          {
            bytesBase64Encoded:
              Buffer.from("zenmux gpt edit").toString("base64"),
            mimeType: "image/png",
          },
        ],
      }),
    });

    await generateZenMuxImages({
      apiKey: "sk-ai-v1-test",
      request: {
        provider: "zenmux",
        model: "openai/gpt-image-1.5",
        prompt: "基于参考图细化结构",
        width: 1536,
        height: 1024,
        imageCount: 1,
        reference: {
          enabled: true,
          elementCount: 2,
          textCount: 1,
          textNotes: ["保持刀柄比例"],
          image: {
            mimeType: "image/png",
            dataBase64: Buffer.from("selection").toString("base64"),
          },
        },
      },
    });

    expect(generateImages).not.toHaveBeenCalled();
    expect(editImage).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://zenmux.ai/api/vertex-ai/v1/publishers/openai/models/gpt-image-1.5:predict",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          instances: [
            {
              prompt:
                "基于参考图细化结构\n\n参考选区中的文字说明：\n1. 保持刀柄比例",
              referenceImages: [
                {
                  referenceImage: {
                    bytesBase64Encoded:
                      Buffer.from("selection").toString("base64"),
                    mimeType: "image/png",
                  },
                  referenceId: 1,
                  referenceType: "REFERENCE_TYPE_RAW",
                },
              ],
            },
          ],
          parameters: {
            sampleCount: 1,
            sampleImageSize: "1536x1024",
            outputOptions: {
              mimeType: "image/png",
            },
          },
        }),
      }),
    );
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
          text: "根据参考继续出图\n\n参考选区中的文字说明：\n1. 保持整体轮廓\n2. 圈出的面板再薄一点",
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
