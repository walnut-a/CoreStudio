import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentConversationComposer } from "./AgentConversationComposer";

describe("AgentConversationComposer", () => {
  it("uses a new-task placeholder before there is conversation context", () => {
    render(
      <AgentConversationComposer
        canSubmitMessage
        hasConversationContext={false}
        hasConversationEntries={false}
        onSubmitMessage={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("继续 Agent 对话")).toHaveAttribute(
      "placeholder",
      "输入任务",
    );
  });

  it("uses the continue placeholder once a thread exists", () => {
    render(
      <AgentConversationComposer
        canSubmitMessage
        hasConversationContext
        hasConversationEntries={false}
        onSubmitMessage={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("继续 Agent 对话")).toHaveAttribute(
      "placeholder",
      "继续对话",
    );
  });

  it("shows the disabled reason and blocks submission when Agent is unavailable", () => {
    const onSubmitMessage = vi.fn();
    render(
      <AgentConversationComposer
        canSubmitMessage={false}
        disabledReason="请先配置 ACP Agent"
        hasConversationContext={false}
        hasConversationEntries={false}
        onSubmitMessage={onSubmitMessage}
      />,
    );

    expect(screen.getByLabelText("继续 Agent 对话")).toBeDisabled();
    expect(screen.getByLabelText("继续 Agent 对话")).toHaveAttribute(
      "placeholder",
      "请先配置 ACP Agent",
    );
    expect(screen.getByRole("button", { name: "发送给 Agent" })).toBeDisabled();
  });

  it("submits trimmed messages and clears the draft", async () => {
    const onSubmitMessage = vi.fn().mockResolvedValue(undefined);
    render(
      <AgentConversationComposer
        canSubmitMessage
        hasConversationContext
        hasConversationEntries
        onSubmitMessage={onSubmitMessage}
      />,
    );

    const input = screen.getByLabelText("继续 Agent 对话");
    fireEvent.change(input, { target: { value: "  继续优化外壳  " } });
    fireEvent.click(screen.getByRole("button", { name: "发送给 Agent" }));

    await waitFor(() =>
      expect(onSubmitMessage).toHaveBeenCalledWith("继续优化外壳"),
    );
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("submits with Enter and preserves Shift Enter for new lines", async () => {
    const onSubmitMessage = vi.fn().mockResolvedValue(undefined);
    render(
      <AgentConversationComposer
        canSubmitMessage
        hasConversationContext
        hasConversationEntries
        onSubmitMessage={onSubmitMessage}
      />,
    );

    const input = screen.getByLabelText("继续 Agent 对话");
    fireEvent.change(input, { target: { value: "第一行" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onSubmitMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(onSubmitMessage).toHaveBeenCalledWith("第一行"));
  });
});
