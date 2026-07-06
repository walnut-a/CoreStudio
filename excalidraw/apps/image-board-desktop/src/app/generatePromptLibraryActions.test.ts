import { describe, expect, it, vi } from "vitest";

import {
  createSavedPromptLibraryRendererActions,
  createGeneratePromptLibraryActions,
  loadSavedPromptLibraryStateAction,
  runSavedPromptDeleteAction,
  runSavedPromptSaveAction,
  runSavedPromptUseAction,
} from "./generatePromptLibraryActions";
import type {
  DesktopBridgeApi,
  SavePromptInput,
  SavedPrompt,
} from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";

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

const savedPrompt = (patch: Partial<SavedPrompt> = {}): SavedPrompt => ({
  id: "prompt-1",
  title: "提示词",
  content: "追加的内容",
  tags: [],
  createdAt: "2026-07-03T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
  useCount: 0,
  ...patch,
});

describe("createGeneratePromptLibraryActions", () => {
  it("saves current prompt content with a compact generated title", () => {
    const onSavePrompt = vi.fn();
    const actions = createGeneratePromptLibraryActions({
      getCurrentRequest: () =>
        createRequest({
          prompt: "  做一台桌面级五轴 CNC  ",
          promptParts: [{ type: "text", text: "  做一台桌面级五轴 CNC  " }],
        }),
      updatePrompt: vi.fn(),
      replacePromptParts: vi.fn(),
      onSavePrompt,
    });

    expect(actions.saveCurrentPrompt()).toBe(true);

    expect(onSavePrompt).toHaveBeenCalledWith({
      title: "做一台桌面级五轴 CNC",
      content: "做一台桌面级五轴 CNC",
      tags: [],
    });
  });

  it("does not save empty prompt content", () => {
    const onSavePrompt = vi.fn();
    const actions = createGeneratePromptLibraryActions({
      getCurrentRequest: () => createRequest({ prompt: "  " }),
      updatePrompt: vi.fn(),
      replacePromptParts: vi.fn(),
      onSavePrompt,
    });

    expect(actions.saveCurrentPrompt()).toBe(false);
    expect(onSavePrompt).not.toHaveBeenCalled();
  });

  it("replaces the current prompt and marks the saved prompt as used", () => {
    const updatePrompt = vi.fn();
    const replacePromptParts = vi.fn();
    const onUsePrompt = vi.fn();
    const actions = createGeneratePromptLibraryActions({
      getCurrentRequest: () => createRequest({ prompt: "旧内容" }),
      updatePrompt,
      replacePromptParts,
      onUsePrompt,
    });

    actions.applySavedPrompt(savedPrompt({ content: "新内容" }), "replace");

    expect(updatePrompt).toHaveBeenCalledWith("新内容");
    expect(replacePromptParts).not.toHaveBeenCalled();
    expect(onUsePrompt).toHaveBeenCalledWith("prompt-1");
  });

  it("appends a saved prompt after existing inline references", () => {
    const updatePrompt = vi.fn();
    const replacePromptParts = vi.fn();
    const onUsePrompt = vi.fn();
    const actions = createGeneratePromptLibraryActions({
      getCurrentRequest: () =>
        createRequest({
          prompt: "旧文本",
          promptParts: [{ type: "reference", referenceId: "ref-1" }],
        }),
      updatePrompt,
      replacePromptParts,
      onUsePrompt,
    });

    actions.applySavedPrompt(savedPrompt({ content: "追加内容" }), "append");

    expect(updatePrompt).not.toHaveBeenCalled();
    expect(replacePromptParts).toHaveBeenCalledWith([
      { type: "reference", referenceId: "ref-1" },
      { type: "text", text: "\n\n追加内容" },
    ]);
    expect(onUsePrompt).toHaveBeenCalledWith("prompt-1");
  });
});

describe("loadSavedPromptLibraryStateAction", () => {
  it("loads saved prompts through the desktop bridge", async () => {
    const prompts = [savedPrompt({ id: "prompt-loaded" })];
    const setSavedPrompts = vi.fn();
    const bridge = {
      loadPromptLibrary: vi.fn().mockResolvedValue(prompts),
    } as Partial<DesktopBridgeApi> as DesktopBridgeApi;

    await loadSavedPromptLibraryStateAction({
      bridge,
      setSavedPrompts,
    });

    expect(bridge.loadPromptLibrary).toHaveBeenCalledTimes(1);
    expect(setSavedPrompts).toHaveBeenCalledWith(prompts);
  });

  it("keeps existing prompts untouched when the desktop bridge is unavailable", async () => {
    const setSavedPrompts = vi.fn();

    await loadSavedPromptLibraryStateAction({
      bridge: null,
      setSavedPrompts,
    });

    expect(setSavedPrompts).not.toHaveBeenCalled();
  });

  it("clears saved prompts when loading fails", async () => {
    const setSavedPrompts = vi.fn();
    const bridge = {
      loadPromptLibrary: vi.fn().mockRejectedValue(new Error("boom")),
    } as Partial<DesktopBridgeApi> as DesktopBridgeApi;

    await loadSavedPromptLibraryStateAction({
      bridge,
      setSavedPrompts,
    });

    expect(setSavedPrompts).toHaveBeenCalledWith([]);
  });
});

describe("saved prompt library mutation actions", () => {
  const input: SavePromptInput = {
    title: "常用提示词",
    content: "做一台桌面 CNC",
    tags: [],
  };

  it("saves a prompt and applies the updated prompt list", async () => {
    const prompts = [savedPrompt({ id: "prompt-saved" })];
    const setSavedPrompts = vi.fn();
    const bridge = {
      savePrompt: vi.fn().mockResolvedValue(prompts),
    } as Partial<DesktopBridgeApi> as DesktopBridgeApi;

    await runSavedPromptSaveAction({
      bridge,
      input,
      setSavedPrompts,
    });

    expect(bridge.savePrompt).toHaveBeenCalledWith(input);
    expect(setSavedPrompts).toHaveBeenCalledWith(prompts);
  });

  it("marks a prompt as used and applies the updated prompt list", async () => {
    const prompts = [savedPrompt({ id: "prompt-used", useCount: 1 })];
    const setSavedPrompts = vi.fn();
    const bridge = {
      markSavedPromptUsed: vi.fn().mockResolvedValue(prompts),
    } as Partial<DesktopBridgeApi> as DesktopBridgeApi;

    await runSavedPromptUseAction({
      bridge,
      id: "prompt-used",
      setSavedPrompts,
    });

    expect(bridge.markSavedPromptUsed).toHaveBeenCalledWith("prompt-used");
    expect(setSavedPrompts).toHaveBeenCalledWith(prompts);
  });

  it("deletes a prompt and applies the updated prompt list", async () => {
    const prompts = [savedPrompt({ id: "prompt-left" })];
    const setSavedPrompts = vi.fn();
    const bridge = {
      deleteSavedPrompt: vi.fn().mockResolvedValue(prompts),
    } as Partial<DesktopBridgeApi> as DesktopBridgeApi;

    await runSavedPromptDeleteAction({
      bridge,
      id: "prompt-removed",
      setSavedPrompts,
    });

    expect(bridge.deleteSavedPrompt).toHaveBeenCalledWith("prompt-removed");
    expect(setSavedPrompts).toHaveBeenCalledWith(prompts);
  });

  it("does not clear prompts when a prompt mutation fails", async () => {
    const setSavedPrompts = vi.fn();
    const bridge = {
      deleteSavedPrompt: vi.fn().mockRejectedValue(new Error("boom")),
    } as Partial<DesktopBridgeApi> as DesktopBridgeApi;

    await expect(
      runSavedPromptDeleteAction({
        bridge,
        id: "prompt-removed",
        setSavedPrompts,
      }),
    ).rejects.toThrow("boom");
    expect(setSavedPrompts).not.toHaveBeenCalled();
  });
});

describe("createSavedPromptLibraryRendererActions", () => {
  const input: SavePromptInput = {
    title: "常用提示词",
    content: "做一台桌面 CNC",
    tags: [],
  };

  it("creates renderer handlers for saved prompt mutations", async () => {
    const saved = [savedPrompt({ id: "prompt-saved" })];
    const used = [savedPrompt({ id: "prompt-used" })];
    const deleted = [savedPrompt({ id: "prompt-deleted" })];
    const bridge = {
      savePrompt: vi.fn().mockResolvedValue(saved),
      markSavedPromptUsed: vi.fn().mockResolvedValue(used),
      deleteSavedPrompt: vi.fn().mockResolvedValue(deleted),
    } as Partial<DesktopBridgeApi> as DesktopBridgeApi;
    const setSavedPrompts = vi.fn();
    const actions = createSavedPromptLibraryRendererActions({
      bridge,
      setSavedPrompts,
    });

    await actions.savePrompt(input);
    await actions.usePrompt("prompt-1");
    await actions.deletePrompt("prompt-2");

    expect(bridge.savePrompt).toHaveBeenCalledWith(input);
    expect(bridge.markSavedPromptUsed).toHaveBeenCalledWith("prompt-1");
    expect(bridge.deleteSavedPrompt).toHaveBeenCalledWith("prompt-2");
    expect(setSavedPrompts).toHaveBeenNthCalledWith(1, saved);
    expect(setSavedPrompts).toHaveBeenNthCalledWith(2, used);
    expect(setSavedPrompts).toHaveBeenNthCalledWith(3, deleted);
  });
});
