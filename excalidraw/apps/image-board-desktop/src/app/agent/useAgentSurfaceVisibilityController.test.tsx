import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAgentSurfaceVisibilityController } from "./useAgentSurfaceVisibilityController";

const Harness = () => {
  const controller = useAgentSurfaceVisibilityController();

  return (
    <div>
      <output data-testid="debug">
        {controller.state.acpDebugOpen ? "debug-open" : "debug-closed"}
      </output>
      <output data-testid="chat">
        {controller.state.chatDockOpen ? "chat-open" : "chat-closed"}
      </output>
      <button
        type="button"
        onClick={() => {
          controller.setters.setAcpDebugOpen(true);
          controller.setters.setChatDockOpen(true);
        }}
      >
        open surfaces
      </button>
      <button
        type="button"
        onClick={() => {
          controller.setters.setAcpDebugOpen(false);
          controller.setters.setChatDockOpen(false);
        }}
      >
        close surfaces
      </button>
    </div>
  );
};

describe("useAgentSurfaceVisibilityController", () => {
  it("keeps Agent surface visibility state behind one renderer controller", () => {
    render(<Harness />);

    expect(screen.getByTestId("debug")).toHaveTextContent("debug-closed");
    expect(screen.getByTestId("chat")).toHaveTextContent("chat-closed");

    fireEvent.click(screen.getByText("open surfaces"));

    expect(screen.getByTestId("debug")).toHaveTextContent("debug-open");
    expect(screen.getByTestId("chat")).toHaveTextContent("chat-open");

    fireEvent.click(screen.getByText("close surfaces"));

    expect(screen.getByTestId("debug")).toHaveTextContent("debug-closed");
    expect(screen.getByTestId("chat")).toHaveTextContent("chat-closed");
  });
});
