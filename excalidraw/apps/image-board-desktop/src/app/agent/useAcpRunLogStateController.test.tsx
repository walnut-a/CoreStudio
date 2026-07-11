import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAcpRunLogStateController } from "./useAcpRunLogStateController";

const Harness = () => {
  const controller = useAcpRunLogStateController();

  return (
    <div>
      <output data-testid="dialog">
        {controller.state.dialogOpen ? "open" : "closed"}
      </output>
      <output data-testid="loading">
        {controller.state.loading ? "loading" : "idle"}
      </output>
      <output data-testid="error">{controller.state.error ?? "none"}</output>
      <output data-testid="raw">
        {controller.state.rawOpen ? "raw-open" : "raw-closed"}
      </output>
      <output data-testid="entries">
        {controller.state.conversationEntries.length}
      </output>
      <output data-testid="timer">
        {controller.actions.getRefreshTimerId() ?? "none"}
      </output>
      <button
        type="button"
        onClick={() => {
          controller.actions.setRefreshTimerId(42);
          controller.setters.setDialogOpen(true);
          controller.setters.setLoading(true);
          controller.setters.setError("读取失败");
          controller.setters.setRawOpen(true);
          controller.setters.setConversationEntries([
            {
              version: 1,
              taskId: "task-1",
              timestamp: "2026-07-06T00:00:00.000Z",
              seq: 1,
              kind: "agent.message",
              payload: { text: "完成" },
            },
          ]);
        }}
      >
        set state
      </button>
    </div>
  );
};

describe("useAcpRunLogStateController", () => {
  it("keeps ACP run-log view state behind one renderer controller", () => {
    render(<Harness />);

    expect(screen.getByTestId("dialog")).toHaveTextContent("closed");
    expect(screen.getByTestId("loading")).toHaveTextContent("idle");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
    expect(screen.getByTestId("raw")).toHaveTextContent("raw-closed");
    expect(screen.getByTestId("entries")).toHaveTextContent("0");
    expect(screen.getByTestId("timer")).toHaveTextContent("none");

    fireEvent.click(screen.getByText("set state"));

    expect(screen.getByTestId("dialog")).toHaveTextContent("open");
    expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    expect(screen.getByTestId("error")).toHaveTextContent("读取失败");
    expect(screen.getByTestId("raw")).toHaveTextContent("raw-open");
    expect(screen.getByTestId("entries")).toHaveTextContent("1");
    expect(screen.getByTestId("timer")).toHaveTextContent("42");
  });
});
