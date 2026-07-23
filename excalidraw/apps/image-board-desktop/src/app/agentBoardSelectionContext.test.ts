import { afterEach, describe, expect, it } from "vitest";

import type { GenerationReferencePayload } from "../shared/providerTypes";

import { copy, setActiveDesktopLocale } from "./copy";
import { buildAgentBoardSelectionContextViewModel } from "./agentBoardSelectionContext";

const buildReference = (): GenerationReferencePayload => ({
  enabled: true,
  elementCount: 6,
  textCount: 2,
  items: [
    {
      id: "image-1",
      index: 1,
      kind: "image",
      label: "图片",
      fileId: "file-1",
      thumbnailDataUrl: "data:image/png;base64,b25l",
    },
    {
      id: "image-2",
      index: 2,
      kind: "image",
      label: "图片",
      fileId: "file-2",
      thumbnailDataUrl: "data:image/png;base64,dHdv",
    },
    {
      id: "image-3",
      index: 3,
      kind: "image",
      label: "图片",
      fileId: "file-3",
    },
    { id: "text-1", index: 4, kind: "text", label: "文本：铝色" },
    { id: "text-2", index: 5, kind: "text", label: "文本：磨砂" },
    { id: "shape-1", index: 6, kind: "shape", label: "矩形" },
  ],
  source: {
    elementIds: [
      "image-1",
      "image-2",
      "image-3",
      "text-1",
      "text-2",
      "shape-1",
    ],
    fileIds: ["file-1", "file-2", "file-3"],
  },
});

describe("buildAgentBoardSelectionContextViewModel", () => {
  afterEach(() => setActiveDesktopLocale("zh-CN"));

  it("builds the compact empty state without copy actions", () => {
    expect(
      buildAgentBoardSelectionContextViewModel(
        null,
        copy.agentBoard.selectionContext,
        "测试项目",
        "project-id-1",
      ),
    ).toEqual({
      selected: false,
      summary: "未选择画布元素",
      clipboardText: null,
      imagePreviews: [],
      imagePreviewOverflow: 0,
      counts: {
        elements: 0,
        images: 0,
        text: 0,
        shapes: 0,
      },
    });
  });

  it("summarizes mixed selections and creates the Codex clipboard sentence", () => {
    const viewModel = buildAgentBoardSelectionContextViewModel(
      buildReference(),
      copy.agentBoard.selectionContext,
      "EDC设计助手",
      "project-id-1",
    );

    expect(viewModel.summary).toBe("6 个元素 · 3 图片 · 2 文字 · 1 图形");
    expect(viewModel.imagePreviews).toHaveLength(2);
    expect(viewModel.imagePreviewOverflow).toBe(1);

    const [instruction, openingTag, payloadJson, closingTag] =
      viewModel.clipboardText?.split("\n") ?? [];
    expect(instruction).toBe(
      "请使用 CoreStudio Skill 处理以下固定画布选区引用。",
    );
    expect(openingTag).toBe('<corestudio-selection-reference version="1">');
    expect(closingTag).toBe("</corestudio-selection-reference>");
    expect(JSON.parse(payloadJson)).toEqual({
      source: "agent-board",
      mode: "snapshot",
      projectName: "EDC设计助手",
      projectId: "project-id-1",
      summary: {
        elements: 6,
        images: 3,
        texts: 2,
        shapes: 1,
      },
      elementIds: [
        "image-1",
        "image-2",
        "image-3",
        "text-1",
        "text-2",
        "shape-1",
      ],
      fileIds: ["file-1", "file-2", "file-3"],
    });
  });

  it("caps image previews at two and localizes English copy", () => {
    setActiveDesktopLocale("en");
    const reference: GenerationReferencePayload = {
      enabled: true,
      elementCount: 5,
      textCount: 0,
      items: Array.from({ length: 5 }, (_, index) => ({
        id: `image-${index + 1}`,
        index: index + 1,
        kind: "image" as const,
        label: "Image",
        fileId: `file-${index + 1}`,
      })),
    };

    const viewModel = buildAgentBoardSelectionContextViewModel(
      reference,
      copy.agentBoard.selectionContext,
      "Test project",
      "project-id-1",
    );

    expect(viewModel.summary).toBe("5 images");
    expect(viewModel.clipboardText).toContain(
      "Use the CoreStudio Skill to process the following fixed canvas selection reference.",
    );
    expect(viewModel.imagePreviews).toHaveLength(2);
    expect(viewModel.imagePreviewOverflow).toBe(3);
  });
});
