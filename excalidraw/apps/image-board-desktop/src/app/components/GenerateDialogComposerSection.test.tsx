import { createRef } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateDialogComposerSection } from "./GenerateDialogComposerSection";
import type { InlinePromptEditorHandle } from "./InlinePromptEditor";
import { copy } from "../copy";

const renderComposerSection = (
  overrides: Partial<Parameters<typeof GenerateDialogComposerSection>[0]> = {},
) => {
  const props: Parameters<typeof GenerateDialogComposerSection>[0] = {
    classNames: ["generate-composer", "generate-composer--with-taskbar"],
    showComposerTaskBar: true,
    showComposerModeSwitch: true,
    showComposerModeIndicator: false,
    composerModeOptions: ["direct", "acp"],
    effectiveComposerMode: "direct",
    isAgentOperationMode: false,
    isPromptComposerMode: true,
    agentSelectionItems: [],
    promptEditorRef: createRef<InlinePromptEditorHandle>(),
    promptEditorParts: [],
    promptReferences: [],
    pendingReference: null,
    promptEditorResetKey: 0,
    referenceLimitMessage: null,
    promptLibraryOpen: false,
    advancedOpen: false,
    canSubmit: true,
    loading: false,
    showGenerationSourceSwitch: true,
    agentGenerationSelectable: true,
    effectiveGenerationSource: "builtin",
    generationSourceLabel: "直接生成",
    generationSourceResetKey: "direct:open",
    agentTaskStatus: null,
    agentTaskEvents: [],
    onSelectComposerMode: vi.fn(),
    onSelectGenerationSource: vi.fn(),
    onStopInputEvent: vi.fn(),
    onCommitPendingReference: vi.fn(),
    onPromptChange: vi.fn(),
    onPromptKeyPressCapture: vi.fn(),
    onPromptKeyUpCapture: vi.fn(),
    onPromptKeyDown: vi.fn(),
    onOpenAgentRunLog: vi.fn(),
    setPromptLibraryOpen: vi.fn(),
    setAdvancedOpen: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateDialogComposerSection {...props} />),
  };
};

describe("GenerateDialogComposerSection", () => {
  it("renders composer content and action controls inside the configured shell", () => {
    const { container } = renderComposerSection();

    expect(container.firstElementChild).toHaveClass("generate-composer");
    expect(container.firstElementChild).toHaveClass(
      "generate-composer--with-taskbar",
    );
    expect(screen.getByRole("tablist", { name: "输入模式" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "提示词" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.generateDialog.generate }),
    ).toBeInTheDocument();
  });

  it("forwards Agent task process actions", () => {
    const onOpenAgentRunLog = vi.fn();
    const onStopInputEvent = vi.fn();

    renderComposerSection({
      agentTaskStatus: {
        taskId: "task-1",
        status: "running",
        message: "Agent 运行中",
      },
      agentTaskEvents: [{ id: "event-1", title: "读取选区" }],
      onOpenAgentRunLog,
      onStopInputEvent,
    });

    fireEvent.click(screen.getByRole("button", { name: "查看任务过程" }));

    expect(onOpenAgentRunLog).toHaveBeenCalledWith("task-1");
    expect(onStopInputEvent).toHaveBeenCalledTimes(1);
  });
});
