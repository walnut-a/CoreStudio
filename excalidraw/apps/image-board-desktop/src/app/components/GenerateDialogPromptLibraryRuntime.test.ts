import { describe, expect, it, vi } from "vitest";

import { createGenerateDialogPromptLibraryRuntime } from "./GenerateDialogPromptLibraryRuntime";

import type { KeyboardEvent, SyntheticEvent } from "react";
import type { SavedPrompt } from "../../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../../shared/providerTypes";

const request: GenerationRequest = {
  provider: "gemini",
  model: "model-a",
  prompt: "一台桌面 CNC",
  width: 1024,
  height: 1024,
  imageCount: 1,
};

const savedPrompts: SavedPrompt[] = [
  {
    id: "prompt-1",
    title: "苹果风 CNC",
    content: "极简、铝合金、圆角",
    tags: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    useCount: 0,
  },
];

const createRuntimeInput = () => ({
  effectiveComposerMode: "direct" as const,
  promptLibraryOpen: true,
  savedPrompts,
  promptLibrarySearch: "",
  promptLibraryCurrentContent: "一台桌面 CNC",
  getCurrentRequest: vi.fn(() => request),
  updatePrompt: vi.fn(),
  replacePromptParts: vi.fn(),
  onSavePrompt: vi.fn(),
  onUsePrompt: vi.fn(),
  onDeletePrompt: vi.fn(),
  setPromptLibrarySearch: vi.fn(),
  handleTextInputKeyDown: vi.fn(),
  stopInputEventPropagation: vi.fn(),
});

describe("createGenerateDialogPromptLibraryRuntime", () => {
  it("shows the section only for an open prompt library in direct mode", () => {
    const input = createRuntimeInput();

    expect(
      createGenerateDialogPromptLibraryRuntime(input)
        .promptLibrarySectionProps.visible,
    ).toBe(true);
    expect(
      createGenerateDialogPromptLibraryRuntime({
        ...input,
        effectiveComposerMode: "acp",
      }).promptLibrarySectionProps.visible,
    ).toBe(false);
    expect(
      createGenerateDialogPromptLibraryRuntime({
        ...input,
        promptLibraryOpen: false,
      }).promptLibrarySectionProps.visible,
    ).toBe(false);
  });

  it("wires section props and prompt library actions", () => {
    const input = createRuntimeInput();
    const runtime = createGenerateDialogPromptLibraryRuntime(input);

    runtime.promptLibrarySectionProps.onSearchChange("apple");
    runtime.promptLibrarySectionProps.onTextInputKeyDown(
      {} as KeyboardEvent<HTMLInputElement>,
    );
    runtime.promptLibrarySectionProps.onStopInputEvent(
      {} as SyntheticEvent<HTMLElement>,
    );
    runtime.promptLibrarySectionProps.promptLibraryActions.saveCurrentPrompt();
    runtime.promptLibrarySectionProps.promptLibraryActions.applySavedPrompt(
      savedPrompts[0],
      "replace",
    );

    expect(runtime.promptLibrarySectionProps.savedPrompts).toBe(savedPrompts);
    expect(runtime.promptLibrarySectionProps.search).toBe("");
    expect(runtime.promptLibrarySectionProps.currentContent).toBe(
      "一台桌面 CNC",
    );
    expect(runtime.promptLibrarySectionProps.canSaveCurrent).toBe(true);
    expect(input.setPromptLibrarySearch).toHaveBeenCalledWith("apple");
    expect(input.handleTextInputKeyDown).toHaveBeenCalledTimes(1);
    expect(input.stopInputEventPropagation).toHaveBeenCalledTimes(1);
    expect(input.onSavePrompt).toHaveBeenCalledWith({
      title: "一台桌面 CNC",
      content: "一台桌面 CNC",
      tags: [],
    });
    expect(input.updatePrompt).toHaveBeenCalledWith("极简、铝合金、圆角");
    expect(input.onUsePrompt).toHaveBeenCalledWith("prompt-1");
  });
});
