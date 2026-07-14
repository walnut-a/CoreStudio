import { describe, expect, it, vi } from "vitest";

import {
  createGenerateComposerEventHandlers,
  handleGenerateActionInputKeyDown,
  handleGenerateComposerFormSubmit,
  handleGenerateComposerPromptKeyDown,
  handleGenerateTextInputKeyDown,
  stopGenerateInputEventPropagation,
} from "./generateComposerEvents";

const createBaseKeyboardEvent = <T extends HTMLElement>(patch: {
  currentTarget: T;
  key?: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
}) =>
  ({
    key: patch.key ?? "Enter",
    metaKey: patch.metaKey ?? false,
    ctrlKey: patch.ctrlKey ?? false,
    altKey: patch.altKey ?? false,
    shiftKey: patch.shiftKey ?? false,
    nativeEvent: {
      isComposing: patch.isComposing ?? false,
      stopImmediatePropagation: vi.fn(),
    },
    currentTarget: patch.currentTarget,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as any);

describe("generateComposerEvents", () => {
  it("stops React and native event propagation", () => {
    const event = {
      stopPropagation: vi.fn(),
      nativeEvent: {
        stopImmediatePropagation: vi.fn(),
      },
    } as any;

    stopGenerateInputEventPropagation(event);

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(event.nativeEvent.stopImmediatePropagation).toHaveBeenCalledTimes(1);
  });

  it("selects all text input content for primary select-all shortcuts", () => {
    const input = document.createElement("input");
    input.value = "select me";
    input.setSelectionRange = vi.fn();
    const submit = vi.fn();
    const event = createBaseKeyboardEvent({
      currentTarget: input,
      key: "a",
      metaKey: true,
    });

    handleGenerateTextInputKeyDown(event, submit);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(input.setSelectionRange).toHaveBeenCalledWith(0, input.value.length);
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits text inputs on plain Enter and preserves multiline chords", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "prompt";
    const submit = vi.fn();

    handleGenerateTextInputKeyDown(
      createBaseKeyboardEvent({ currentTarget: textarea, key: "Enter" }),
      submit,
    );

    expect(submit).toHaveBeenCalledTimes(1);

    const shiftEnter = createBaseKeyboardEvent({
      currentTarget: textarea,
      key: "Enter",
      shiftKey: true,
    });
    handleGenerateTextInputKeyDown(shiftEnter, submit);

    expect(shiftEnter.preventDefault).not.toHaveBeenCalled();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("selects all rich prompt content through the provided selector", () => {
    const target = document.createElement("div");
    target.textContent = "prompt";
    const submit = vi.fn();
    const selectAll = vi.fn();
    const event = createBaseKeyboardEvent({
      currentTarget: target,
      key: "a",
      ctrlKey: true,
    });

    handleGenerateComposerPromptKeyDown(event, {
      submit,
      selectAllElementContents: selectAll,
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(selectAll).toHaveBeenCalledWith(target);
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits rich prompt content on plain Enter", () => {
    const target = document.createElement("div");
    const submit = vi.fn();
    const event = createBaseKeyboardEvent({
      currentTarget: target,
      key: "Enter",
    });

    handleGenerateComposerPromptKeyDown(event, {
      submit,
      selectAllElementContents: vi.fn(),
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("prevents form submit defaults before submitting", () => {
    const event = {
      preventDefault: vi.fn(),
    } as any;
    const submit = vi.fn();

    handleGenerateComposerFormSubmit(event, submit);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("runs input actions on Enter while preserving composition", () => {
    const input = document.createElement("input");
    const action = vi.fn();
    const event = createBaseKeyboardEvent({
      currentTarget: input,
      key: "Enter",
    });

    handleGenerateActionInputKeyDown(event, action);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledTimes(1);

    const composingEnter = createBaseKeyboardEvent({
      currentTarget: input,
      key: "Enter",
      isComposing: true,
    });
    handleGenerateActionInputKeyDown(composingEnter, action);

    expect(composingEnter.preventDefault).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(1);

    const tab = createBaseKeyboardEvent({
      currentTarget: input,
      key: "Tab",
    });
    handleGenerateActionInputKeyDown(tab, action);

    expect(tab.preventDefault).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("creates composer event handlers wired to submit", () => {
    const submit = vi.fn();
    const handlers = createGenerateComposerEventHandlers({
      submit,
    });

    const prompt = document.createElement("div");
    handlers.handleComposerPromptKeyDown(
      createBaseKeyboardEvent({ currentTarget: prompt, key: "Enter" }),
    );

    const formSubmitEvent = {
      preventDefault: vi.fn(),
    } as any;
    handlers.handleSubmit(formSubmitEvent);

    expect(submit).toHaveBeenCalledTimes(2);
    expect(formSubmitEvent.preventDefault).toHaveBeenCalledTimes(1);
  });
});
