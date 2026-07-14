import { describe, expect, it, vi } from "vitest";

import { createGenerateDialogComposerRuntime } from "./GenerateDialogComposerRuntime";

import type { FormEvent, SyntheticEvent } from "react";
import type { GenerationRequest } from "../../shared/providerTypes";

const request: GenerationRequest = {
  provider: "gemini",
  model: "model-a",
  prompt: "一台桌面 CNC",
  width: 1024,
  height: 1024,
  imageCount: 1,
};

const createEvent = () =>
  ({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    nativeEvent: {
      stopImmediatePropagation: vi.fn(),
      isComposing: false,
    },
  } as unknown as SyntheticEvent<HTMLElement>);

const createRuntimeInput = () => {
  const updateRequest = vi.fn(
    (updater: (current: GenerationRequest) => GenerationRequest) =>
      updater(request),
  );

  return {
    isPromptComposerMode: true,
    canSubmit: true,
    effectiveGenerationSource: "builtin" as const,
    requestRef: { current: request },
    currentProviderCustomModels: [],
    canCommitPendingReference: false,
    commitPendingReference: vi.fn(),
    clearSubmittedPrompt: vi.fn(),
    onSubmit: vi.fn(),
    modeSwitchVariant: "acp-agent" as const,
    agentGenerationSelectable: true,
    setComposerMode: vi.fn(),
    setGenerationSource: vi.fn(),
    updateRequest,
  };
};

describe("createGenerateDialogComposerRuntime", () => {
  it("wires form submit through the generation submit handler", () => {
    const input = createRuntimeInput();
    const runtime = createGenerateDialogComposerRuntime(input);
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;

    runtime.handleSubmit(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(input.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "一台桌面 CNC",
        generationSource: "builtin",
      }),
      false,
    );
    expect(input.clearSubmittedPrompt).toHaveBeenCalledTimes(1);
  });

  it("wires mode selection through shared handlers", () => {
    const input = createRuntimeInput();
    const runtime = createGenerateDialogComposerRuntime(input);
    const modeEvent = createEvent();
    runtime.selectComposerMode("acp", modeEvent);

    expect(modeEvent.stopPropagation).toHaveBeenCalledTimes(1);
    expect(
      modeEvent.nativeEvent.stopImmediatePropagation,
    ).toHaveBeenCalledTimes(1);
    expect(input.setComposerMode).toHaveBeenCalledWith("acp");
    expect(input.setGenerationSource).toHaveBeenCalledWith("agent");
    expect(input.updateRequest).toHaveBeenCalledWith(expect.any(Function));
    expect(input.updateRequest.mock.results[0]?.value).toEqual(
      expect.objectContaining({
        generationSource: "agent",
      }),
    );
  });
});
