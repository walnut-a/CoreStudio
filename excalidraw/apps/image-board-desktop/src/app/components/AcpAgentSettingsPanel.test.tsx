import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  type AcpAgentPresetId,
} from "../../shared/acpTypes";
import { AcpAgentSettingsPanel } from "./AcpAgentSettingsPanel";

const renderPanel = (
  overrides: Partial<Parameters<typeof AcpAgentSettingsPanel>[0]> = {},
) => {
  const props: Parameters<typeof AcpAgentSettingsPanel>[0] = {
    draft: {
      enabled: false,
      presetId: "codex-acp",
      command: "npx",
      args: "-y @agentclientprotocol/codex-acp",
      cwd: "",
      taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
    },
    selectedAgent: null,
    editable: true,
    saving: false,
    defaultCwd: "/Users/example/CoreStudioProject",
    onEnabledChange: vi.fn(),
    onPresetChange: vi.fn(),
    onCommandChange: vi.fn(),
    onArgsChange: vi.fn(),
    onCwdChange: vi.fn(),
    onTaskInstructionChange: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<AcpAgentSettingsPanel {...props} />),
  };
};

describe("AcpAgentSettingsPanel", () => {
  it("renders the ACP Agent settings and concrete default cwd", () => {
    renderPanel({
      selectedAgent: {
        id: "agent-1",
        presetId: "codex-acp",
        name: "Codex ACP",
        command: "npx",
        args: ["-y", "@agentclientprotocol/codex-acp"],
        cwd: null,
      },
    });

    expect(screen.getByText("ACP Agent")).toBeInTheDocument();
    expect(
      screen.getByText(/直接输入偏向单次生成，ACP Agent 偏向带上下文的连续任务/),
    ).toBeInTheDocument();
    expect(screen.getByText("未启用")).toBeInTheDocument();
    expect(screen.getByLabelText("工作目录")).toHaveAttribute(
      "placeholder",
      "默认：/Users/example/CoreStudioProject",
    );
    expect(screen.getByText("当前：Codex ACP · npx")).toBeInTheDocument();
  });

  it("reports edits and save actions", () => {
    const onEnabledChange = vi.fn();
    const onPresetChange = vi.fn();
    const onCommandChange = vi.fn();
    const onArgsChange = vi.fn();
    const onCwdChange = vi.fn();
    const onTaskInstructionChange = vi.fn();
    const onSave = vi.fn();

    renderPanel({
      onEnabledChange,
      onPresetChange,
      onCommandChange,
      onArgsChange,
      onCwdChange,
      onTaskInstructionChange,
      onSave,
    });

    fireEvent.click(screen.getByRole("switch", { name: "启用 ACP Agent" }));
    fireEvent.change(screen.getByLabelText("Agent 类型"), {
      target: { value: "gemini-cli" satisfies AcpAgentPresetId },
    });
    fireEvent.change(screen.getByLabelText("命令"), {
      target: { value: "gemini" },
    });
    fireEvent.change(screen.getByLabelText("参数"), {
      target: { value: "--acp" },
    });
    fireEvent.change(screen.getByLabelText("工作目录"), {
      target: { value: "/tmp/project" },
    });
    fireEvent.change(screen.getByLabelText("任务说明模板"), {
      target: { value: "请按项目规则写回。" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onEnabledChange).toHaveBeenCalledWith(true);
    expect(onPresetChange).toHaveBeenCalledWith("gemini-cli");
    expect(onCommandChange).toHaveBeenCalledWith("gemini");
    expect(onArgsChange).toHaveBeenCalledWith("--acp");
    expect(onCwdChange).toHaveBeenCalledWith("/tmp/project");
    expect(onTaskInstructionChange).toHaveBeenCalledWith(
      "请按项目规则写回。",
    );
    expect(onSave).toHaveBeenCalled();
  });

  it("disables controls when the bridge cannot save ACP settings", () => {
    renderPanel({
      editable: false,
    });

    expect(screen.getByRole("switch", { name: "启用 ACP Agent" })).toBeDisabled();
    expect(screen.getByLabelText("Agent 类型")).toBeDisabled();
    expect(screen.getByLabelText("命令")).toBeDisabled();
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("shows the saving state", () => {
    renderPanel({
      saving: true,
    });

    expect(screen.getByRole("button", { name: "保存中..." })).toBeDisabled();
  });
});
