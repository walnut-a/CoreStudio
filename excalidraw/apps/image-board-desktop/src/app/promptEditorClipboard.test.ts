import { describe, expect, it } from "vitest";

import {
  clonePromptEditorClipboardFragment,
  embedPromptEditorClipboardFragmentInHtml,
  parsePromptEditorClipboardFragment,
  parsePromptEditorClipboardFragmentFromHtml,
  serializePromptEditorClipboardFragment,
} from "./promptEditorClipboard";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
} from "../shared/providerTypes";

const parts: GenerationPromptPart[] = [
  { type: "text", text: "风格参考 " },
  { type: "reference", referenceId: "source-reference" },
];

const references: GenerationPromptReferencePayload[] = [
  {
    id: "source-reference",
    label: "图片",
    enabled: true,
    elementCount: 1,
    textCount: 0,
    image: {
      mimeType: "image/png",
      dataBase64: "image-data",
    },
    source: {
      elementIds: ["element-1"],
      fileIds: ["file-1"],
    },
  },
];

describe("prompt editor clipboard", () => {
  it("round-trips a versioned prompt fragment with reference data", () => {
    expect(
      parsePromptEditorClipboardFragment(
        serializePromptEditorClipboardFragment({ parts, references }),
      ),
    ).toEqual({ version: 1, parts, references });
  });

  it("rejects malformed, unsupported, or incomplete fragments", () => {
    expect(parsePromptEditorClipboardFragment("not-json")).toBeNull();
    expect(
      parsePromptEditorClipboardFragment(
        JSON.stringify({ version: 2, parts, references }),
      ),
    ).toBeNull();
    expect(
      parsePromptEditorClipboardFragment(
        serializePromptEditorClipboardFragment({ parts, references: [] }),
      ),
    ).toBeNull();
  });

  it("assigns fresh ids while preserving shared reference identity", () => {
    const fragment = parsePromptEditorClipboardFragment(
      serializePromptEditorClipboardFragment({
        parts: [
          ...parts,
          { type: "reference", referenceId: "source-reference" },
        ],
        references,
      }),
    );
    expect(fragment).not.toBeNull();

    const cloned = clonePromptEditorClipboardFragment(
      fragment!,
      () => "pasted-reference",
    );

    expect(cloned.references).toEqual([
      expect.objectContaining({ id: "pasted-reference" }),
    ]);
    expect(
      cloned.parts
        .filter((part) => part.type === "reference")
        .map((part) => part.referenceId),
    ).toEqual(["pasted-reference", "pasted-reference"]);
  });

  it("round-trips a fragment through standard clipboard html", () => {
    const serialized = serializePromptEditorClipboardFragment({
      parts,
      references,
    });
    const html = embedPromptEditorClipboardFragmentInHtml(
      "<span>风格参考</span>",
      serialized,
    );

    expect(html).toContain("data-corestudio-prompt-fragment");
    expect(parsePromptEditorClipboardFragmentFromHtml(html)).toEqual({
      version: 1,
      parts,
      references,
    });
  });

  it("ignores clipboard html without a valid embedded fragment", () => {
    expect(
      parsePromptEditorClipboardFragmentFromHtml("<span>普通文本</span>"),
    ).toBeNull();
    expect(
      parsePromptEditorClipboardFragmentFromHtml(
        '<span data-corestudio-prompt-fragment="%E0%A4%A">损坏内容</span>',
      ),
    ).toBeNull();
  });
});
