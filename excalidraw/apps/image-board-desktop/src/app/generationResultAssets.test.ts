import { describe, expect, it } from "vitest";

import type {
  GenerationRequest,
  GenerationResponse,
} from "../shared/providerTypes";
import { buildCoreStudioGeneratedImageAssetInputs } from "./generationResultAssets";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "gemini",
  model: "google/gemini-3-pro-image-preview",
  prompt: "生成一张产品图",
  negativePrompt: "",
  aspectRatio: null,
  width: 1024,
  height: 1024,
  seed: null,
  imageCount: 1,
  reference: null,
  ...patch,
});

const createResponse = (
  patch: Partial<GenerationResponse> = {},
): GenerationResponse => ({
  provider: "gemini",
  model: "google/gemini-3-pro-image-preview",
  seed: 1024,
  createdAt: "2026-07-04T10:00:00.000Z",
  images: [
    {
      fileName: "image-1.png",
      mimeType: "image/png",
      dataBase64: "base64-image-1",
      width: 1024,
      height: 768,
    },
  ],
  ...patch,
});

describe("buildCoreStudioGeneratedImageAssetInputs", () => {
  it("maps provider images into CoreStudio generated asset inputs", () => {
    const request = createRequest({
      prompt: "把 ",
      promptParts: [
        { type: "text", text: "把 " },
        { type: "reference", referenceId: "ref-1" },
        { type: "text", text: " 做得更简洁" },
      ],
      promptReferences: [
        {
          id: "ref-1",
          label: "参考图 A",
          enabled: true,
          elementCount: 1,
          textCount: 0,
          image: {
            mimeType: "image/png",
            dataBase64: "reference-base64",
          },
          source: {
            elementIds: ["element-1"],
            fileIds: ["reference-file"],
          },
          items: [
            {
              id: "item-1",
              index: 1,
              kind: "image",
              label: "图片",
              fileId: "reference-file",
            },
          ],
        },
      ],
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
        debug: {
          fileId: "parent-file",
        },
      },
      negativePrompt: "不要水印",
    });
    const response = createResponse({
      images: [
        {
          fileName: "first.png",
          mimeType: "image/png",
          dataBase64: "first-base64",
          width: 1024,
          height: 768,
        },
        {
          fileName: "second.jpg",
          mimeType: "image/jpeg",
          dataBase64: "second-base64",
          width: 640,
          height: 640,
        },
      ],
    });

    const result = buildCoreStudioGeneratedImageAssetInputs({
      request,
      response,
      createFileId: (index) => `file-${index + 1}`,
    });

    expect(result).toEqual([
      expect.objectContaining({
        fileId: "file-1",
        fileName: "first.png",
        mimeType: "image/png",
        dataBase64: "first-base64",
        width: 1024,
        height: 768,
        sourceType: "generated",
        generationOrigin: "corestudio",
        provider: "gemini",
        model: "google/gemini-3-pro-image-preview",
        prompt: "把 参考图 1 做得更简洁",
        negativePrompt: "不要水印",
        seed: 1024,
        createdAt: "2026-07-04T10:00:00.000Z",
        parentFileId: "parent-file",
        promptReferences: [
          {
            id: "ref-1",
            index: 1,
            label: "参考图 1",
            kind: "image",
            fileIds: ["reference-file"],
            elementIds: ["element-1"],
          },
        ],
      }),
      expect.objectContaining({
        fileId: "file-2",
        fileName: "second.jpg",
        mimeType: "image/jpeg",
        dataBase64: "second-base64",
        width: 640,
        height: 640,
        parentFileId: "parent-file",
      }),
    ]);
  });

  it("omits optional reference metadata when the request has no references", () => {
    const result = buildCoreStudioGeneratedImageAssetInputs({
      request: createRequest({ prompt: "" }),
      response: createResponse(),
      createFileId: () => "generated-file",
    });

    expect(result[0]).toMatchObject({
      fileId: "generated-file",
      prompt: "",
      parentFileId: null,
    });
    expect(result[0]).not.toHaveProperty("promptReferences");
  });
});
