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
    enabled: false,
    elementCount: 1,
    textCount: 0,
  },
});

describe("generationRequestState", () => {
  it("keeps the same request object when the selection summary is unchanged", () => {
    const request = createRequest();

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: false,
      elementCount: 1,
      textCount: 0,
    });

    expect(next).toBe(request);
  });

  it("updates the request when the selection summary changes", () => {
    const request = createRequest();

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: false,
      elementCount: 2,
      textCount: 1,
      textNotes: ["保留整体比例"],
    });

    expect(next).not.toBe(request);
    expect(next.reference).toEqual({
      enabled: false,
      elementCount: 2,
      textCount: 1,
      textNotes: ["保留整体比例"],
    });
  });

  it("preserves the current enabled state while syncing the latest summary", () => {
    const request: GenerationRequest = {
      ...createRequest(),
      reference: {
        enabled: true,
        elementCount: 1,
        textCount: 0,
      },
    };

    const next = syncSelectionReferenceIntoRequest(request, {
      enabled: false,
      elementCount: 3,
      textCount: 0,
    });

    expect(next.reference?.enabled).toBe(true);
    expect(next.reference?.elementCount).toBe(3);
  });
});
