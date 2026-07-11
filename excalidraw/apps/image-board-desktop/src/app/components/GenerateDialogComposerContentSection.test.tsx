import { createRef } from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateDialogComposerContentSection } from "./GenerateDialogComposerContentSection";
import type { InlinePromptEditorHandle } from "./InlinePromptEditor";

const renderContentSection = (
  overrides: Partial<Parameters<typeof GenerateDialogComposerContentSection>[0]> = {},
) => {
  const props: Parameters<typeof GenerateDialogComposerContentSection>[0] = {
    showComposerTaskBar: true,
    showComposerModeSwitch: true,
    showComposerModeIndicator: false,
    composerModeOptions: ["direct", "acp"],
    effectiveComposerMode: "direct",
    isAgentOperationMode: false,
    agentSelectionItems: [],
    promptEditorRef: createRef<InlinePromptEditorHandle>(),
    promptEditorParts: [],
    promptReferences: [],
    pendingReference: null,
    promptEditorResetKey: 0,
    referenceLimitMessage: null,
    onSelectComposerMode: vi.fn(),
    onStopInputEvent: vi.fn(),
    onCommitPendingReference: vi.fn(),
    onPromptChange: vi.fn(),
    onPromptKeyPressCapture: vi.fn(),
    onPromptKeyUpCapture: vi.fn(),
    onPromptKeyDown: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateDialogComposerContentSection {...props} />),
  };
};

describe("GenerateDialogComposerContentSection", () => {
  it("renders mode controls and forwards mode selection", () => {
    const onSelectComposerMode = vi.fn();

    renderContentSection({ onSelectComposerMode });

    const tablist = screen.getByRole("tablist", { name: "输入模式" });
    expect(
      within(tablist).getByRole("tab", { name: "直接输入" }),
    ).toHaveAttribute("aria-selected", "true");

    fireEvent.click(within(tablist).getByRole("tab", { name: "ACP Agent" }));

    expect(onSelectComposerMode).toHaveBeenCalledWith(
      "acp",
      expect.any(Object),
    );
  });

  it("renders Agent operation context instead of the prompt editor", () => {
    renderContentSection({
      isAgentOperationMode: true,
      effectiveComposerMode: "agent",
      composerModeOptions: ["agent", "direct"],
      agentSelectionItems: [
        {
          id: "image-1",
          index: 1,
          kind: "image",
          label: "图片",
          thumbnailDataUrl: "data:image/png;base64,abc",
        },
      ],
    });

    const selection = screen.getByLabelText("当前选区");
    expect(within(selection).getByText("图片")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "提示词" })).toBeNull();
  });

  it("commits pending references from prompt focus and mouse down intent", () => {
    const onCommitPendingReference = vi.fn();
    const onStopInputEvent = vi.fn();

    renderContentSection({
      onCommitPendingReference,
      onStopInputEvent,
      referenceLimitMessage: "最多可以引用 3 张图片",
    });

    const editor = screen.getByRole("textbox", { name: "提示词" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "最多可以引用 3 张图片",
    );

    fireEvent.focus(editor);
    fireEvent.mouseDown(editor);

    expect(onCommitPendingReference).toHaveBeenCalledTimes(2);
    expect(onStopInputEvent).toHaveBeenCalledTimes(1);
  });
});
