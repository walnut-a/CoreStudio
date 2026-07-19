import { describe, expect, it } from "vitest";

import { getAgentImageAssetsFromPayload } from "./agentCommandImageAssets";

describe("agentCommandImageAssets", () => {
  it("normalizes Agent Board image provenance and references from the root payload", () => {
    const assets = getAgentImageAssetsFromPayload({
      projectPath: "/tmp/corestudio-project",
      sourceType: "generated",
      generationOrigin: "agent-board",
      prompt: "优化桌面 CNC",
      referenceFileIds: ["source-file"],
      referenceElementIds: ["source-element"],
      fileId: "input-file",
      mimeType: "image/png",
      dataBase64: Buffer.from("image").toString("base64"),
      width: 512,
      height: 512,
    });

    expect(assets).toMatchObject([
      {
        fileId: expect.stringMatching(/^agent-/),
        mimeType: "image/png",
        dataBase64: Buffer.from("image").toString("base64"),
        width: 512,
        height: 512,
        sourceType: "generated",
        generationOrigin: "agent-board",
        prompt: "优化桌面 CNC",
        promptReferences: [
          {
            id: "agent-reference-1",
            index: 1,
            label: "参考图 1",
            kind: "image",
            fileIds: ["source-file"],
            elementIds: ["source-element"],
          },
        ],
      },
    ]);
  });

  it("applies root defaults to each file in a files payload", () => {
    const assets = getAgentImageAssetsFromPayload({
      sourceType: "generated",
      generationOrigin: "agent-board",
      prompt: "生成一组方案",
      files: [
        {
          fileId: "input-file-1",
          mimeType: "image/png",
          dataBase64: "image-1",
          width: 512,
          height: 512,
        },
        {
          fileId: "input-file-2",
          mimeType: "image/png",
          dataBase64: "image-2",
          width: 768,
          height: 512,
          prompt: "第二张单独提示词",
        },
      ],
    });

    expect(assets).toHaveLength(2);
    expect(assets).toEqual([
      expect.objectContaining({
        sourceType: "generated",
        generationOrigin: "agent-board",
        prompt: "生成一组方案",
      }),
      expect.objectContaining({
        sourceType: "generated",
        generationOrigin: "agent-board",
        prompt: "第二张单独提示词",
      }),
    ]);
  });

  it("rejects invalid generation origin before producing assets", () => {
    expect(() =>
      getAgentImageAssetsFromPayload({
        generationOrigin: "manual",
        fileId: "input-file",
        mimeType: "image/png",
        dataBase64: "image",
        width: 512,
        height: 512,
      }),
    ).toThrow("图片生成来源格式不正确。");
  });

  it("requires Codex writeback to declare the image source type", () => {
    expect(() =>
      getAgentImageAssetsFromPayload({
        generationOrigin: "agent-board",
        fileId: "input-file",
        mimeType: "image/png",
        dataBase64: "image",
        width: 512,
        height: 512,
      }),
    ).toThrow("Codex 写入图片必须明确记录来源类型。");
  });

  it("does not allow Codex writeback to claim CoreStudio generation", () => {
    expect(() =>
      getAgentImageAssetsFromPayload({
        sourceType: "generated",
        generationOrigin: "corestudio",
        fileId: "input-file",
        mimeType: "image/png",
        dataBase64: "image",
        width: 512,
        height: 512,
      }),
    ).toThrow("Codex 生成图片必须记录为 Codex 来源。");
  });

  it("does not allow imported Codex images to keep a generation origin", () => {
    expect(() =>
      getAgentImageAssetsFromPayload({
        sourceType: "imported",
        generationOrigin: "agent-board",
        fileId: "input-file",
        mimeType: "image/png",
        dataBase64: "image",
        width: 512,
        height: 512,
      }),
    ).toThrow("导入图片不能记录生成来源。");
  });

  it("rejects empty explicit reference ids", () => {
    expect(() =>
      getAgentImageAssetsFromPayload({
        sourceType: "generated",
        generationOrigin: "agent-board",
        referenceFileIds: " , ",
        fileId: "input-file",
        mimeType: "image/png",
        dataBase64: "image",
        width: 512,
        height: 512,
      }),
    ).toThrow("referenceFileIds 不能为空。");
  });
});
