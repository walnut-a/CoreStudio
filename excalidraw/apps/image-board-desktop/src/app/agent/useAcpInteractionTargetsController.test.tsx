import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAcpInteractionTargetsController } from "./useAcpInteractionTargetsController";

const Harness = ({
  onTaskRefChange,
}: {
  onTaskRefChange: (taskId: string | null) => void;
}) => {
  const controller = useAcpInteractionTargetsController();

  return (
    <div>
      <output data-testid="thread-state">
        {controller.state.activeThreadId ?? "none"}
      </output>
      <output data-testid="thread-ref">
        {controller.actions.getActiveThreadId() ?? "none"}
      </output>
      <output data-testid="surface-state">
        {controller.state.runLogSurface ?? "none"}
      </output>
      <output data-testid="surface-ref">
        {controller.actions.getRunLogSurface() ?? "none"}
      </output>
      <button
        type="button"
        onClick={() => controller.actions.activeThreadActions.set("thread-1")}
      >
        set thread
      </button>
      <button
        type="button"
        onClick={() => controller.actions.activeThreadActions.set(null)}
      >
        clear thread
      </button>
      <button
        type="button"
        onClick={() => {
          controller.actions.runLogTargetActions.setTaskId("task-1");
          controller.actions.runLogTargetActions.setSurface("conversation");
        }}
      >
        set run log
      </button>
      <button
        type="button"
        onClick={() => {
          controller.actions.activeTaskActions.set("task-2");
          onTaskRefChange(controller.actions.getActiveTaskId());
        }}
      >
        set task
      </button>
    </div>
  );
};

describe("useAcpInteractionTargetsController", () => {
  it("keeps ACP target refs behind one renderer controller", () => {
    const onTaskRefChange = vi.fn();

    render(<Harness onTaskRefChange={onTaskRefChange} />);

    expect(screen.getByTestId("thread-state")).toHaveTextContent("none");
    expect(screen.getByTestId("thread-ref")).toHaveTextContent("none");
    expect(screen.getByTestId("surface-state")).toHaveTextContent("none");
    expect(screen.getByTestId("surface-ref")).toHaveTextContent("none");

    fireEvent.click(screen.getByText("set thread"));

    expect(screen.getByTestId("thread-state")).toHaveTextContent("thread-1");
    expect(screen.getByTestId("thread-ref")).toHaveTextContent("thread-1");

    fireEvent.click(screen.getByText("set run log"));

    expect(screen.getByTestId("surface-state")).toHaveTextContent(
      "conversation",
    );
    expect(screen.getByTestId("surface-ref")).toHaveTextContent(
      "conversation",
    );

    fireEvent.click(screen.getByText("set task"));

    expect(onTaskRefChange).toHaveBeenCalledWith("task-2");

    fireEvent.click(screen.getByText("clear thread"));

    expect(screen.getByTestId("thread-state")).toHaveTextContent("none");
    expect(screen.getByTestId("thread-ref")).toHaveTextContent("none");
  });
});
