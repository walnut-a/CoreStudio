import { describe, expect, it } from "vitest";

import {
  buildImagePromptReferenceRecords,
  buildPromptTextWithInlineReferences,
} from "./promptReferences";

describe("promptReferences", () => {
  it("turns inline reference parts into ordered prompt placeholders", () => {
    expect(
      buildPromptTextWithInlineReferences({
        prompt: "风格参考这个： 造型参考这个：",
        promptParts: [
          { type: "text", text: "风格参考这个：" },
          { type: "reference", referenceId: "style" },
          { type: "text", text: "，造型参考这个：" },
          { type: "reference", referenceId: "shape" },
        ],
        promptReferences: [
          {
            id: "shape",
            label: "图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: "shape",
            },
          },
          {
            id: "style",
            label: "图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            image: {
              mimeType: "image/png",
              dataBase64: "style",
            },
          },
        ],
      }),
    ).toBe("风格参考这个：参考图 1，造型参考这个：参考图 2");
  });

  it("keeps inline reference source metadata in prompt order", () => {
    expect(
      buildImagePromptReferenceRecords({
        prompt: "",
        promptParts: [
          { type: "text", text: "造型参考：" },
          { type: "reference", referenceId: "shape" },
          { type: "text", text: "，风格参考：" },
          { type: "reference", referenceId: "style" },
        ],
        promptReferences: [
          {
            id: "style",
            label: "图片",
            enabled: true,
            elementCount: 1,
            textCount: 0,
            items: [
              {
                id: "element-style",
                index: 1,
                kind: "image",
                label: "图片",
                fileId: "file-style",
              },
            ],
            image: {
              mimeType: "image/png",
              dataBase64: "style",
            },
            source: {
              elementIds: ["element-style"],
              fileIds: ["file-style"],
            },
          },
          {
            id: "shape",
            label: "标注图",
            enabled: true,
            elementCount: 2,
            textCount: 0,
            items: [
              {
                id: "element-shape",
                index: 1,
                kind: "shape",
                label: "矩形",
              },
            ],
            image: {
              mimeType: "image/png",
              dataBase64: "shape",
            },
            source: {
              elementIds: ["element-shape", "label-shape"],
            },
          },
        ],
        reference: null,
      }),
    ).toEqual([
      {
        id: "shape",
        index: 1,
        label: "参考图 1",
        kind: "snapshot",
        elementIds: ["element-shape", "label-shape"],
      },
      {
        id: "style",
        index: 2,
        label: "参考图 2",
        kind: "image",
        fileIds: ["file-style"],
        elementIds: ["element-style"],
      },
    ]);
  });
});
