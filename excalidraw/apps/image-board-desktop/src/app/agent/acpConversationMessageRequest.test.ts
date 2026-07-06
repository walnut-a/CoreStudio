import { describe, expect, it } from "vitest";

import type {
  GenerationReferencePayload,
  GenerationRequest,
} from "../../shared/providerTypes";
import {
  buildAcpConversationMessageRequest,
  shouldBuildAcpConversationSelectionReference,
} from "./acpConversationMessageRequest";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "gemini",
  model: "gemini-2.5-flash-image-preview",
  prompt: "上一轮 prompt",
  width: 1024,
  height: 1024,
  imageCount: 1,
  promptParts: [{ type: "text", text: "上一轮 prompt" }],
  promptReferences: [
    {
      id: "prompt-ref-1",
      label: "图片",
      enabled: true,
      elementCount: 1,
      textCount: 0,
    },
  ],
  ...patch,
});

describe("shouldBuildAcpConversationSelectionReference", () => {
  it("skips selection reference when the current selection was explicitly removed", () => {
    expect(
      shouldBuildAcpConversationSelectionReference({
        selectionReferenceSignature: "image-1",
        removedSelectionReferenceSignature: "image-1",
      }),
    ).toBe(false);
  });

  it("builds selection reference when there is no removed signature match", () => {
    expect(
      shouldBuildAcpConversationSelectionReference({
        selectionReferenceSignature: "image-1",
        removedSelectionReferenceSignature: null,
      }),
    ).toBe(true);
    expect(
      shouldBuildAcpConversationSelectionReference({
        selectionReferenceSignature: null,
        removedSelectionReferenceSignature: "image-1",
      }),
    ).toBe(true);
  });
});

describe("buildAcpConversationMessageRequest", () => {
  it("converts a follow-up message into an ACP Agent generation request", () => {
    const reference: GenerationReferencePayload = {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [{ id: "image-1", index: 1, kind: "image", label: "图片 1" }],
    };

    expect(
      buildAcpConversationMessageRequest({
        currentRequest: createRequest({
          generationSource: "builtin",
          reference: null,
        }),
        message: "继续优化这张图",
        reference,
        customModels: [],
      }),
    ).toMatchObject({
      generationSource: "agent",
      prompt: "继续优化这张图",
      promptParts: [],
      promptReferences: [],
      reference: {
        items: reference.items,
      },
    });
  });
});
