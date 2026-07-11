import { describe, expect, it, vi } from "vitest";

import {
  applyGenerateComposerModeSelection,
  applyGenerateComposerSourceSelection,
  createGenerateComposerModeSelectionHandlers,
  buildGenerateComposerModeSelectionPlan,
  buildGenerateComposerSourceSelectionPlan,
} from "./generateComposerModeActions";
import type { GenerationRequest } from "../../shared/providerTypes";

const createRequest = (
  patch: Partial<GenerationRequest> = {},
): GenerationRequest => ({
  provider: "gemini",
  model: "gemini-2.5-flash-image-preview",
  prompt: "",
  width: 1024,
  height: 1024,
  imageCount: 1,
  ...patch,
});

describe("generateComposerModeActions", () => {
  it("syncs generation source when the software ACP mode switch changes mode", () => {
    expect(
      buildGenerateComposerModeSelectionPlan({
        modeSwitchVariant: "acp-agent",
        mode: "acp",
      }),
    ).toEqual({
      mode: "acp",
      generationSource: "agent",
    });

    expect(
      buildGenerateComposerModeSelectionPlan({
        modeSwitchVariant: "acp-agent",
        mode: "direct",
      }),
    ).toEqual({
      mode: "direct",
      generationSource: "builtin",
    });
  });

  it("keeps Agent Board mode switches from changing generation source", () => {
    expect(
      buildGenerateComposerModeSelectionPlan({
        modeSwitchVariant: "agent-operation",
        mode: "agent",
      }),
    ).toEqual({
      mode: "agent",
      generationSource: null,
    });
  });

  it("rejects Agent generation source selection when Agent generation is unavailable", () => {
    expect(
      buildGenerateComposerSourceSelectionPlan({
        source: "agent",
        agentGenerationSelectable: false,
      }),
    ).toEqual({
      accepted: false,
      generationSource: null,
    });
  });

  it("accepts built-in source selection even when Agent generation is unavailable", () => {
    expect(
      buildGenerateComposerSourceSelectionPlan({
        source: "builtin",
        agentGenerationSelectable: false,
      }),
    ).toEqual({
      accepted: true,
      generationSource: "builtin",
    });
  });

  it("applies composer mode selection and syncs generation source into the request", () => {
    const setComposerMode = vi.fn();
    const setGenerationSource = vi.fn();
    const updateRequest = vi.fn((updater) =>
      updater(createRequest({ generationSource: "builtin" })),
    );

    const plan = applyGenerateComposerModeSelection({
      modeSwitchVariant: "acp-agent",
      mode: "acp",
      setComposerMode,
      setGenerationSource,
      updateRequest,
    });

    expect(plan).toEqual({
      mode: "acp",
      generationSource: "agent",
    });
    expect(setComposerMode).toHaveBeenCalledWith("acp");
    expect(setGenerationSource).toHaveBeenCalledWith("agent");
    expect(updateRequest.mock.results[0]?.value).toMatchObject({
      generationSource: "agent",
    });
  });

  it("does not update generation source when selecting Agent source is unavailable", () => {
    const setGenerationSource = vi.fn();
    const updateRequest = vi.fn();

    const plan = applyGenerateComposerSourceSelection({
      source: "agent",
      agentGenerationSelectable: false,
      setGenerationSource,
      updateRequest,
    });

    expect(plan).toEqual({
      accepted: false,
      generationSource: null,
    });
    expect(setGenerationSource).not.toHaveBeenCalled();
    expect(updateRequest).not.toHaveBeenCalled();
  });

  it("creates composer mode and source handlers that stop input events before applying selection", () => {
    const stopInputEventPropagation = vi.fn();
    const setComposerMode = vi.fn();
    const setGenerationSource = vi.fn();
    const updateRequest = vi.fn((updater) =>
      updater(createRequest({ generationSource: "builtin" })),
    );
    const modeEvent = { type: "mode-click" };
    const sourceEvent = { type: "source-click" };
    const handlers = createGenerateComposerModeSelectionHandlers({
      modeSwitchVariant: "acp-agent",
      agentGenerationSelectable: true,
      stopInputEventPropagation,
      setComposerMode,
      setGenerationSource,
      updateRequest,
    });

    const modePlan = handlers.selectComposerMode("acp", modeEvent);
    const sourcePlan = handlers.selectGenerationSource("builtin", sourceEvent);

    expect(stopInputEventPropagation).toHaveBeenNthCalledWith(1, modeEvent);
    expect(stopInputEventPropagation).toHaveBeenNthCalledWith(2, sourceEvent);
    expect(modePlan).toEqual({
      mode: "acp",
      generationSource: "agent",
    });
    expect(sourcePlan).toEqual({
      accepted: true,
      generationSource: "builtin",
    });
    expect(setComposerMode).toHaveBeenCalledWith("acp");
    expect(setGenerationSource).toHaveBeenNthCalledWith(1, "agent");
    expect(setGenerationSource).toHaveBeenNthCalledWith(2, "builtin");
  });
});
