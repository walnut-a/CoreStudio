import { describe, expect, it, vi } from "vitest";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import {
  createGenerationSubmitRendererActions,
  runGenerationSubmitRendererAction,
} from "./generationSubmitRendererController";

const request = {
  generationSource: "agent",
  provider: "openai",
  model: "gpt-image-1",
  prompt: "椅子",
  width: 1024,
  height: 1024,
} as GenerationRequest;

const project = { projectPath: "/tmp/project" } as DesktopProjectBundle;

describe("generationSubmitRendererController", () => {
  it("skips submission when no project is open", async () => {
    expect(
      await runGenerationSubmitRendererAction({
        request,
        project: null,
        providerSettings: null,
        rejectOnError: false,
        clearGenerationError: vi.fn(),
        assertProjectActive: vi.fn(),
        startBuiltinGeneration: vi.fn(),
        showGenerationError: vi.fn(),
      }),
    ).toEqual({ status: "skipped-no-project" });
  });

  it("normalizes every local submission to built-in generation", async () => {
    const startBuiltinGeneration = vi.fn(async () => ({}));
    const result = await runGenerationSubmitRendererAction({
      request,
      project,
      providerSettings: null,
      rejectOnError: false,
      clearGenerationError: vi.fn(),
      assertProjectActive: vi.fn(),
      startBuiltinGeneration,
      showGenerationError: vi.fn(),
    });

    expect(result).toEqual({ status: "builtin-started" });
    expect(startBuiltinGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ generationSource: "builtin" }),
      project,
    );
  });

  it("passes placement options through the reusable submit action", async () => {
    const startBuiltinGeneration = vi.fn(async () => ({}));
    const actions = createGenerationSubmitRendererActions({
      getProject: () => project,
      getProviderSettings: () => null,
      clearGenerationError: vi.fn(),
      assertProjectActive: vi.fn(),
      startBuiltinGeneration,
      showGenerationError: vi.fn(),
    });

    await actions.submit(request, true, { expectedProjectPath: "/tmp/project" });
    expect(startBuiltinGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ generationSource: "builtin" }),
      project,
      expect.objectContaining({ expectedProjectPath: "/tmp/project" }),
    );
  });
});
