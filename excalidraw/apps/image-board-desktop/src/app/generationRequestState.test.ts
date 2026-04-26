import { describe, expect, it } from "vitest";

import { syncSelectionReferenceIntoRequest } from "./generationRequestState";
import type { GenerationRequest } from "../shared/providerTypes";

const createRequest = (): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "优化刀盘结构",
  width: 1024,
  height: 1024,
  imageCount: 1,
  seed: null,
  reference: {
    enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image",
          label: "图片",
        },
      ],
    },
});

describe("generationRequestState", () => {
  it("keeps the same request object when the selection summary is unchanged", () => {
    const request = createRequest();

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image",
          label: "图片",
        },
      ],
    });

    expect(next).toBe(request);
  });

  it("updates the request when the selection summary changes", () => {
    const request = createRequest();

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: true,
      elementCount: 2,
      textCount: 1,
      textNotes: ["保留整体比例"],
      items: [
        {
          id: "text-1",
          index: 1,
          kind: "text",
          label: "文本：保留整体比例",
        },
        {
          id: "image-1",
          index: 2,
          kind: "image",
          label: "图片",
        },
      ],
    });

    expect(next).not.toBe(request);
    expect(next.reference).toEqual({
      enabled: true,
      elementCount: 2,
      textCount: 1,
      textNotes: ["保留整体比例"],
      items: [
        {
          id: "text-1",
          index: 1,
          kind: "text",
          label: "文本：保留整体比例",
        },
        {
          id: "image-1",
          index: 2,
          kind: "image",
          label: "图片",
        },
      ],
    });
  });

  it("updates the request when reference item details change", () => {
    const request = createRequest();

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-2",
          index: 1,
          kind: "image",
          label: "图片",
        },
      ],
    });

    expect(next).not.toBe(request);
    expect(next.reference?.items?.[0]?.id).toBe("image-2");
  });

  it("automatically enables a newly synced selection reference", () => {
    const request: GenerationRequest = {
      ...createRequest(),
      reference: {
        enabled: false,
        elementCount: 1,
        textCount: 0,
      },
    };

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: true,
      elementCount: 3,
      textCount: 0,
    });

    expect(next.reference?.enabled).toBe(true);
    expect(next.reference?.elementCount).toBe(3);
  });
});
