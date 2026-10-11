import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateImages } from "./providers";
import { loadProviderSettings, saveProviderSettings } from "./settingsStore";

import type {
  GenerationRequest,
  ProviderId,
} from "../src/shared/providerTypes";

const host = vi.hoisted(() => ({
  directory: "",
  generateContent: vi.fn(),
  googleClient: vi.fn(),
}));

// 只替换 Electron 和外部网络；配置落盘、能力校验、路由和响应解析均用生产逻辑。
vi.mock("electron", () => ({
  app: { getPath: () => host.directory },
  nativeImage: {
    createFromBuffer: () => ({
      getSize: () => ({ width: 1024, height: 1024 }),
      toPNG: () => Buffer.from("reference-pixels"),
    }),
  },
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: host.googleClient,
}));

const fetchMock = vi.fn();
const imageBytes = Buffer.from("generated-image");
const imageBase64 = imageBytes.toString("base64");
const prompt = "一张工业设计草图";
const request = (provider: ProviderId, model: string): GenerationRequest => ({
  provider,
  model,
  prompt,
  width: 1024,
  height: 1024,
  imageCount: 1,
});
const jsonResponse = (body: unknown) => ({
  ok: true,
  json: async () => body,
});

beforeEach(async () => {
  host.directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-provider-flow-"),
  );
  vi.clearAllMocks();
  fetchMock.mockReset();
  host.generateContent.mockReset();
  host.googleClient.mockImplementation(() => ({
    models: { generateContent: host.generateContent },
  }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await fs.rm(host.directory, { recursive: true, force: true });
});

const services: Array<{
  provider: ProviderId;
  model: string;
  endpoint?: string;
}> = [
  { provider: "gemini", model: "gemini-2.5-flash-image" },
  { provider: "zenmux", model: "google/gemini-2.5-flash-image" },
  {
    provider: "openai",
    model: "gpt-image-2",
    endpoint: "https://api.openai.com/v1/images/generations",
  },
  {
    provider: "openai-compatible",
    model: "vendor/image-model",
    endpoint: "https://images.example.com/v1/images/edits",
  },
  {
    provider: "fal",
    model: "fal-ai/nano-banana-2",
    endpoint: "https://fal.run/fal-ai/nano-banana-2",
  },
  {
    provider: "jimeng",
    model: "doubao-seedream-5-0-lite-260128",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
  },
  {
    provider: "openrouter",
    model: "google/gemini-3.1-flash-image-preview",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
  },
];

describe("配置服务后生成图片", () => {
  it.each(services)(
    "$provider 从保存配置到生成结果，密钥只进入服务端请求",
    async ({ provider, model, endpoint }) => {
      const apiKey = `local-test-key-${provider}`;
      const configured = await saveProviderSettings({
        provider,
        apiKey,
        defaultModel: model,
        ...(provider === "openai-compatible"
          ? {
              displayName: "内部网关",
              baseUrl: "https://images.example.com/v1/",
              customModels: [
                {
                  id: model,
                  capabilityTemplate: "image-editing-aspect-ratio",
                  adapter: "openai-images",
                },
              ],
            }
          : {}),
      });
      expect(configured.providers[provider]).toMatchObject({
        isConfigured: true,
        defaultModel: model,
      });
      expect(JSON.stringify(configured)).not.toContain(apiKey);
      const settingsPath = path.join(
        host.directory,
        "Excalidraw Image Board",
        "image-board-settings.json",
      );
      if (process.platform !== "win32") {
        expect((await fs.stat(settingsPath)).mode & 0o777).toBe(0o600);
      }

      const input = request(provider, model);
      if (provider === "openai-compatible") {
        input.promptParts = [
          { type: "reference", referenceId: "shape" },
          { type: "text", text: " 的材质参考 " },
          { type: "reference", referenceId: "material" },
        ];
        input.promptReferences = ["material", "shape"].map((id) => ({
          id,
          label: id,
          enabled: true,
          elementCount: 1,
          textCount: 0,
          image: {
            mimeType: "image/png",
            dataBase64: Buffer.from(id).toString("base64"),
          },
        }));
      }
      if (provider === "gemini" || provider === "zenmux") {
        host.generateContent.mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  { inlineData: { mimeType: "image/png", data: imageBase64 } },
                ],
              },
            },
          ],
        });
      } else if (provider === "fal") {
        fetchMock
          .mockResolvedValueOnce(
            jsonResponse({
              images: [
                {
                  url: "https://images.example.com/result.png",
                  content_type: "image/png",
                },
              ],
            }),
          )
          .mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => imageBytes,
          });
      } else if (provider === "openrouter") {
        fetchMock.mockResolvedValueOnce(
          jsonResponse({
            choices: [
              {
                message: {
                  images: [
                    {
                      image_url: {
                        url: `data:image/png;base64,${imageBase64}`,
                      },
                    },
                  ],
                },
              },
            ],
          }),
        );
      } else {
        fetchMock.mockResolvedValueOnce(
          jsonResponse({ data: [{ b64_json: imageBase64 }] }),
        );
      }

      const result = await generateImages({ request: input });
      expect(result).toMatchObject({
        provider,
        model,
        images: [
          {
            mimeType: "image/png",
            dataBase64: imageBase64,
            width: 1024,
            height: 1024,
          },
        ],
      });
      expect(result.images).toHaveLength(1);
      if (!endpoint) {
        expect(host.googleClient).toHaveBeenCalledWith(
          expect.objectContaining({
            apiKey,
            ...(provider === "zenmux"
              ? {
                  vertexai: true,
                  httpOptions: {
                    baseUrl: "https://zenmux.ai/api/vertex-ai",
                    apiVersion: "v1",
                  },
                }
              : {}),
          }),
        );
        expect(host.generateContent).toHaveBeenCalledWith(
          expect.objectContaining({ model, contents: prompt }),
        );
        expect(fetchMock).not.toHaveBeenCalled();
      } else {
        expect(fetchMock.mock.calls[0][0]).toBe(endpoint);
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect(init.method).toBe("POST");
        expect(init.headers).toMatchObject({
          Authorization: `${provider === "fal" ? "Key" : "Bearer"} ${apiKey}`,
        });
        if (provider === "openai-compatible") {
          const body = init.body as FormData;
          expect(body.get("model")).toBe(model);
          expect(body.get("prompt")).toBe("参考图 1 的材质参考 参考图 2");
          expect(body.getAll("image[]")).toHaveLength(2);
        } else {
          const body = JSON.parse(init.body as string);
          expect(
            provider === "openrouter" ? body.messages[0].content : body.prompt,
          ).toBe(prompt);
        }
        if (provider === "fal") {
          expect(fetchMock.mock.calls[1][0]).toBe(
            "https://images.example.com/result.png",
          );
        }
      }
      const saved = await loadProviderSettings();
      expect(saved.providers[provider]).toMatchObject({
        lastStatus: "success",
      });
      expect(JSON.stringify(saved)).not.toContain(apiKey);
      expect(JSON.stringify(result)).not.toContain(apiKey);
    },
  );

  it("未配置时不联网，服务失败后保留错误，成功重试再清除错误", async () => {
    const input = request("openai", "gpt-image-2");
    await expect(generateImages({ request: input })).rejects.toThrow(
      "not configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    await saveProviderSettings({
      provider: "openai",
      apiKey: "local-retry-key",
      defaultModel: input.model,
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: "quota", message: "quota exceeded" } }),
    );
    await expect(generateImages({ request: input })).rejects.toThrow(
      "quota exceeded",
    );
    expect((await loadProviderSettings()).providers.openai).toMatchObject({
      lastStatus: "error",
      lastError: expect.stringContaining("quota exceeded"),
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [{ b64_json: imageBase64 }] }),
    );
    await expect(generateImages({ request: input })).resolves.toMatchObject({
      images: [{ dataBase64: imageBase64 }],
    });
    expect((await loadProviderSettings()).providers.openai).toMatchObject({
      lastStatus: "success",
      lastError: null,
    });
  });
});
