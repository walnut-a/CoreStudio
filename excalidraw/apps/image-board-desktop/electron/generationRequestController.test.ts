import { describe, expect, it, vi } from "vitest";

import { createGenerationRequestController } from "./generationRequestController";

import type { GenerationRequest, GenerationResponse } from "../src/shared/providerTypes";

const createRequest = (): GenerationRequest => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "一台可折叠桌面 CNC",
  width: 1024,
  height: 1024,
  imageCount: 1,
  seed: null,
  reference: null,
});

const createResponse = (): GenerationResponse => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  seed: null,
  createdAt: "2026-07-09T00:00:00.000Z",
  images: [],
});

describe("createGenerationRequestController", () => {
  it("passes a cancelable signal to generation providers and aborts by job id", async () => {
    let providerSignal: AbortSignal | undefined;
    const generateImages = vi.fn(
      async (input: { signal?: AbortSignal }): Promise<GenerationResponse> => {
        providerSignal = input.signal;
        return new Promise((_, reject) => {
          input.signal?.addEventListener("abort", () => {
            reject(input.signal?.reason);
          });
        });
      },
    );
    const controller = createGenerationRequestController({ generateImages });

    const request = controller.generate({
      projectPath: "/tmp/corestudio-project",
      generationJobId: "job-1",
      request: createRequest(),
    });

    expect(providerSignal?.aborted).toBe(false);
    expect(controller.cancel("job-1")).toEqual({ cancelled: true });

    await expect(request).rejects.toThrow("用户已取消生成任务。");
    expect(providerSignal?.aborted).toBe(true);
  });

  it("cleans completed jobs out of the cancellation registry", async () => {
    const controller = createGenerationRequestController({
      generateImages: vi.fn(async () => createResponse()),
    });

    await expect(
      controller.generate({
        projectPath: "/tmp/corestudio-project",
        generationJobId: "job-1",
        request: createRequest(),
      }),
    ).resolves.toEqual(createResponse());

    expect(controller.cancel("job-1")).toEqual({ cancelled: false });
  });

  it("aborts an older request when the same job id is reused", async () => {
    const providerSignals: AbortSignal[] = [];
    const generateImages = vi.fn(
      async (input: { signal?: AbortSignal }): Promise<GenerationResponse> => {
        if (input.signal) {
          providerSignals.push(input.signal);
        }
        return new Promise(() => undefined);
      },
    );
    const controller = createGenerationRequestController({ generateImages });

    void controller.generate({
      projectPath: "/tmp/corestudio-project",
      generationJobId: "job-1",
      request: createRequest(),
    });
    void controller.generate({
      projectPath: "/tmp/corestudio-project",
      generationJobId: "job-1",
      request: createRequest(),
    });

    expect(providerSignals[0]?.aborted).toBe(true);
    expect(providerSignals[1]?.aborted).toBe(false);
  });
});
