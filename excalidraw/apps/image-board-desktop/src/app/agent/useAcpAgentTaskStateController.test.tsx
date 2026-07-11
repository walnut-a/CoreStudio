import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAcpAgentTaskStateController } from "./useAcpAgentTaskStateController";

const Harness = () => {
  const controller = useAcpAgentTaskStateController();

  return (
    <div>
      <output data-testid="task-id">
        {controller.state.task?.taskId ?? "none"}
      </output>
      <output data-testid="task-status">
        {controller.state.task?.status ?? "idle"}
      </output>
      <button
        type="button"
        onClick={() =>
          controller.setters.setTask({
            taskId: "task-1",
            status: "running",
            message: "生成中",
            transcript: "",
            events: [],
            logPath: "/tmp/acp-task.jsonl",
          })
        }
      >
        set task
      </button>
      <button type="button" onClick={() => controller.setters.setTask(null)}>
        clear task
      </button>
    </div>
  );
};

describe("useAcpAgentTaskStateController", () => {
  it("keeps ACP Agent task UI state behind one renderer controller", () => {
    render(<Harness />);

    expect(screen.getByTestId("task-id")).toHaveTextContent("none");
    expect(screen.getByTestId("task-status")).toHaveTextContent("idle");

    fireEvent.click(screen.getByText("set task"));

    expect(screen.getByTestId("task-id")).toHaveTextContent("task-1");
    expect(screen.getByTestId("task-status")).toHaveTextContent("running");

    fireEvent.click(screen.getByText("clear task"));

    expect(screen.getByTestId("task-id")).toHaveTextContent("none");
    expect(screen.getByTestId("task-status")).toHaveTextContent("idle");
  });
});
