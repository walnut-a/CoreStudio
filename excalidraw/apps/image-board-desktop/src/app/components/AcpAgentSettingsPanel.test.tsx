import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE } from "../../shared/acpTypes";
import { AcpAgentSettingsPanel } from "./AcpAgentSettingsPanel";

const renderPanel = () => {
  const onSave = vi.fn();
  render(
    <AcpAgentSettingsPanel
      draft={{
        enabled: true,
        presetId: "codex-acp",
        command: "npx",
        args: "-y @agentclientprotocol/codex-acp",
        cwd: "",
        taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
      }}
      selectedAgent={null}
      editable
      saving={false}
      defaultCwd="/Users/example/CoreStudioProject"
      onBack={vi.fn()}
      onCommandChange={vi.fn()}
      onArgsChange={vi.fn()}
      onCwdChange={vi.fn()}
      onTaskInstructionChange={vi.fn()}
      onSave={onSave}
      debugContent={<div>调试记录内容</div>}
    />,
  );
  return { onSave };
};

describe("AcpAgentSettingsPanel", () => {
  it("高级页不再显示第二个启用开关和 Agent 类型", () => {
    renderPanel();

    expect(screen.queryByRole("switch", { name: "启用 ACP Agent" })).toBeNull();
    expect(screen.queryByLabelText("Agent 类型")).toBeNull();
    expect(screen.getByLabelText("命令")).toBeInTheDocument();
    expect(screen.getByLabelText("工作目录")).toHaveAttribute(
      "placeholder",
      "默认：/Users/example/CoreStudioProject",
    );
  });

  it("保留显式保存和调试记录", () => {
    const { onSave } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByText("调试记录内容")).toBeInTheDocument();
  });
});
