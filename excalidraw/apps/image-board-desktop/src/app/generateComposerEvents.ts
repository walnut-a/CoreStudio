import type { FormEvent, KeyboardEvent, SyntheticEvent } from "react";

import { getGenerateComposerKeyboardAction } from "./generateComposerKeyboard";

export const stopGenerateInputEventPropagation = (
  event: SyntheticEvent<HTMLElement>,
) => {
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation?.();
};

export const selectAllElementContents = (element: HTMLElement) => {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
};

export const handleGenerateComposerPromptKeyDown = (
  event: KeyboardEvent<HTMLDivElement>,
  {
    submit,
    selectAllElementContents: selectAllContents = selectAllElementContents,
  }: {
    submit: () => void;
    selectAllElementContents?: (element: HTMLDivElement) => void;
  },
) => {
  stopGenerateInputEventPropagation(event);

  const action = getGenerateComposerKeyboardAction({
    key: event.key,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    isComposing: event.nativeEvent.isComposing,
  });

  if (action === "select-all") {
    event.preventDefault();
    selectAllContents(event.currentTarget);
    return;
  }

  if (action !== "submit") {
    return;
  }

  event.preventDefault();
  submit();
};

export const handleGenerateTextInputKeyDown = (
  event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  submit: () => void,
) => {
  stopGenerateInputEventPropagation(event);

  const action = getGenerateComposerKeyboardAction({
    key: event.key,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    isComposing: event.nativeEvent.isComposing,
  });

  if (action === "select-all") {
    event.preventDefault();
    event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
    return;
  }

  if (action !== "submit") {
    return;
  }

  event.preventDefault();
  submit();
};

export const handleGenerateActionInputKeyDown = (
  event: KeyboardEvent<HTMLInputElement>,
  action: () => void,
) => {
  stopGenerateInputEventPropagation(event);

  if (event.key !== "Enter" || event.nativeEvent.isComposing) {
    return;
  }

  event.preventDefault();
  action();
};

export const handleGenerateComposerFormSubmit = (
  event: FormEvent<HTMLFormElement>,
  submit: () => void,
) => {
  event.preventDefault();
  submit();
};

export const createGenerateComposerEventHandlers = ({
  submit,
}: {
  submit: () => void;
}) => ({
  stopInputEventPropagation: stopGenerateInputEventPropagation,
  handleInputKeyPhaseCapture: (
    event: KeyboardEvent<
      HTMLTextAreaElement | HTMLInputElement | HTMLDivElement
    >,
  ) => {
    stopGenerateInputEventPropagation(event);
  },
  handleComposerPromptKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
    handleGenerateComposerPromptKeyDown(event, {
      submit,
    });
  },
  handleTextInputKeyDown: (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    handleGenerateTextInputKeyDown(event, submit);
  },
  handleSubmit: (event: FormEvent<HTMLFormElement>) => {
    handleGenerateComposerFormSubmit(event, submit);
  },
});
