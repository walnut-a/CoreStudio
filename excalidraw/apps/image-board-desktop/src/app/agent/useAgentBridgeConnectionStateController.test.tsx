import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAgentBridgeConnectionStateController } from "./useAgentBridgeConnectionStateController";

const Harness = () => {
  const controller = useAgentBridgeConnectionStateController();

  return (
    <div>
      <output data-testid="status">
        {controller.state.status?.enabled ? "enabled" : "disabled"}
      </output>
      <output data-testid="board-url">
        {controller.state.status?.boardUrl ?? "none"}
      </output>
      <output data-testid="auto-open">
        {controller.state.autoOpenProjectPath ?? "none"}
      </output>
      <button
        type="button"
        onClick={() => {
          controller.setters.setStatus({
            enabled: true,
            ready: true,
            boardUrl: "http://127.0.0.1:5174/agent-board",
            currentProject: null,
          });
          controller.setters.setAutoOpenProjectPath("/tmp/project.corestudio");
        }}
      >
        set connection
      </button>
      <button
        type="button"
        onClick={() => {
          controller.setters.setStatus(null);
          controller.setters.setAutoOpenProjectPath(null);
        }}
      >
        clear connection
      </button>
    </div>
  );
};

describe("useAgentBridgeConnectionStateController", () => {
  it("keeps Agent Bridge connection state behind one renderer controller", () => {
    render(<Harness />);

    expect(screen.getByTestId("status")).toHaveTextContent("disabled");
    expect(screen.getByTestId("board-url")).toHaveTextContent("none");
    expect(screen.getByTestId("auto-open")).toHaveTextContent("none");

    fireEvent.click(screen.getByText("set connection"));

    expect(screen.getByTestId("status")).toHaveTextContent("enabled");
    expect(screen.getByTestId("board-url")).toHaveTextContent(
      "http://127.0.0.1:5174/agent-board",
    );
    expect(screen.getByTestId("auto-open")).toHaveTextContent(
      "/tmp/project.corestudio",
    );

    fireEvent.click(screen.getByText("clear connection"));

    expect(screen.getByTestId("status")).toHaveTextContent("disabled");
    expect(screen.getByTestId("board-url")).toHaveTextContent("none");
    expect(screen.getByTestId("auto-open")).toHaveTextContent("none");
  });
});
