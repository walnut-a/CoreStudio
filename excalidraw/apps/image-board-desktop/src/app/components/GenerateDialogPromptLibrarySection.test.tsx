import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateDialogPromptLibrarySection } from "./GenerateDialogPromptLibrarySection";
import { copy } from "../copy";

import type { SavedPrompt } from "../../shared/desktopBridgeTypes";

const savedPrompts: SavedPrompt[] = [
  {
    id: "prompt-1",
    title: "苹果风 CNC",
    content: "极简、铝合金、圆角",
    tags: ["工业设计"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    useCount: 2,
  },
];

const renderSection = (
  overrides: Partial<Parameters<typeof GenerateDialogPromptLibrarySection>[0]> = {},
) => {
  const props: Parameters<typeof GenerateDialogPromptLibrarySection>[0] = {
    visible: true,
    savedPrompts,
    search: "",
    currentContent: "当前 prompt",
    canSaveCurrent: true,
    onSearchChange: vi.fn(),
    promptLibraryActions: {
      saveCurrentPrompt: vi.fn(),
      applySavedPrompt: vi.fn(),
    },
    onDeletePrompt: vi.fn(),
    onTextInputKeyDown: vi.fn(),
    onStopInputEvent: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateDialogPromptLibrarySection {...props} />),
  };
};

describe("GenerateDialogPromptLibrarySection", () => {
  it("renders nothing while hidden", () => {
    const { container } = renderSection({ visible: false });

    expect(container).toBeEmptyDOMElement();
  });

  it("wraps save apply and delete actions with input event isolation", () => {
    const onStopInputEvent = vi.fn();
    const saveCurrentPrompt = vi.fn();
    const applySavedPrompt = vi.fn();
    const onDeletePrompt = vi.fn();

    renderSection({
      onStopInputEvent,
      promptLibraryActions: {
        saveCurrentPrompt,
        applySavedPrompt,
      },
      onDeletePrompt,
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: copy.generateDialog.promptLibrarySaveCurrent,
      }),
    );

    const prompt = screen.getByText("苹果风 CNC").closest("article");
    expect(prompt).not.toBeNull();
    const promptActions = within(prompt as HTMLElement);

    fireEvent.click(
      promptActions.getByRole("button", { name: "替换：苹果风 CNC" }),
    );
    fireEvent.click(
      promptActions.getByRole("button", { name: "追加：苹果风 CNC" }),
    );
    fireEvent.click(
      promptActions.getByRole("button", { name: "删除：苹果风 CNC" }),
    );

    expect(onStopInputEvent).toHaveBeenCalledTimes(4);
    expect(saveCurrentPrompt).toHaveBeenCalledTimes(1);
    expect(applySavedPrompt).toHaveBeenNthCalledWith(
      1,
      savedPrompts[0],
      "replace",
    );
    expect(applySavedPrompt).toHaveBeenNthCalledWith(
      2,
      savedPrompts[0],
      "append",
    );
    expect(onDeletePrompt).toHaveBeenCalledWith("prompt-1");
  });
});
