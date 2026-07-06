import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useAgentRuntimeRefsController } from "./useAgentRuntimeRefsController";

const Harness = () => {
  const controller = useAgentRuntimeRefsController();
  const [, setRevision] = useState(0);
  const refresh = () => setRevision((revision) => revision + 1);

  return (
    <div>
      <output data-testid="timer">
        {controller.actions.getStatePublishTimerId() ?? "none"}
      </output>
      <output data-testid="sequence">
        {controller.actions.isThreadLoadSequenceCurrent(1)
          ? "first-current"
          : "first-stale"}
      </output>
      <button
        type="button"
        onClick={() => {
          controller.actions.setStatePublishTimerId(42);
          refresh();
        }}
      >
        set timer
      </button>
      <button
        type="button"
        onClick={() => {
          controller.actions.setStatePublishTimerId(null);
          refresh();
        }}
      >
        clear timer
      </button>
      <button
        type="button"
        onClick={() => {
          controller.actions.nextThreadLoadSequence();
          refresh();
        }}
      >
        next sequence
      </button>
    </div>
  );
};

describe("useAgentRuntimeRefsController", () => {
  it("keeps Agent runtime refs behind stable renderer actions", () => {
    render(<Harness />);

    expect(screen.getByTestId("timer")).toHaveTextContent("none");
    expect(screen.getByTestId("sequence")).toHaveTextContent("first-stale");

    fireEvent.click(screen.getByText("set timer"));

    expect(screen.getByTestId("timer")).toHaveTextContent("42");

    fireEvent.click(screen.getByText("next sequence"));

    expect(screen.getByTestId("sequence")).toHaveTextContent("first-current");

    fireEvent.click(screen.getByText("clear timer"));

    expect(screen.getByTestId("timer")).toHaveTextContent("none");
  });
});
