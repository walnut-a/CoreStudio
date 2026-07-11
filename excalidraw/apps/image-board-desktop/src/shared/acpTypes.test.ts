import { describe, expect, it } from "vitest";

import {
  ACP_PROTOCOL_VERSION,
  DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
  createAcpTaskEvent,
  getDefaultAcpAgentSettings,
  getAcpAgentPreset,
  getSelectedAcpAgent,
  normalizeAcpAgentSettings,
} from "./acpTypes";

describe("acpTypes", () => {
  it("uses ACP v1 and normalizes disabled empty settings", () => {
    expect(ACP_PROTOCOL_VERSION).toBe(1);
    expect(
      normalizeAcpAgentSettings({
        enabled: true,
        agents: [],
        defaultAgentId: "missing",
        taskInstructionTemplate: "",
      }),
    ).toEqual({
      enabled: false,
      agents: [],
      defaultAgentId: null,
      taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
    });
  });

  it("tells ACP agents to use the CLI executable from the task package", () => {
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain(
      "capabilities.cli.executable",
    );
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain(
      "capabilities.cli.environment",
    );
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain("read records");
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain("read health");
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain("edit locate");
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain(
      'locateKind: "referenced-by-result"',
    );
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain(
      'reason: "missing-board-element"',
    );
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain(
      "project data repair",
    );
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain(
      "--origin acp-agent",
    );
    expect(DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE).toContain(
      "--reference-file-ids",
    );
  });

  it("keeps a valid custom agent command", () => {
    expect(
      normalizeAcpAgentSettings({
        enabled: true,
        defaultAgentId: "custom",
        taskInstructionTemplate: "只允许通过 CoreStudio CLI 写回。",
        agents: [
          {
            id: "custom",
            name: "Custom ACP",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: "/tmp",
          },
        ],
      }),
    ).toEqual({
      enabled: true,
      defaultAgentId: "custom",
      taskInstructionTemplate: "只允许通过 CoreStudio CLI 写回。",
      agents: [
        {
          id: "custom",
          name: "Custom ACP",
          command: "/usr/local/bin/acp-agent",
          args: ["--stdio"],
          cwd: "/tmp",
        },
      ],
    });
  });

  it("keeps a known ACP preset identity with its command template", () => {
    expect(getAcpAgentPreset("codex-acp")).toMatchObject({
      id: "codex-acp",
      name: "Codex ACP",
      command: "npx",
      args: ["-y", "@agentclientprotocol/codex-acp"],
    });
    expect(getAcpAgentPreset("gemini-cli")).toMatchObject({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: ["--acp"],
    });

    expect(
      normalizeAcpAgentSettings({
        enabled: true,
        defaultAgentId: "default",
        taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
        agents: [
          {
            id: "default",
            presetId: "gemini-cli",
            name: "Gemini CLI",
            command: "gemini",
            args: ["--acp"],
            cwd: null,
          },
        ],
      }),
    ).toEqual({
      enabled: true,
      defaultAgentId: "default",
      taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
      agents: [
        {
          id: "default",
          presetId: "gemini-cli",
          name: "Gemini CLI",
          command: "gemini",
          args: ["--acp"],
          cwd: null,
        },
      ],
    });
  });

  it("trims invalid agents and chooses the first valid default", () => {
    expect(
      normalizeAcpAgentSettings({
        enabled: true,
        defaultAgentId: "missing",
        agents: [
          {
            id: "blank",
            name: "Blank",
            command: "  ",
            args: [],
            cwd: null,
          },
          {
            id: "  custom  ",
            name: "  Custom ACP  ",
            command: "  /usr/local/bin/acp-agent  ",
            args: ["--stdio", 7 as unknown as string],
            cwd: "  ",
          },
        ],
      }),
    ).toEqual({
      enabled: true,
      defaultAgentId: "custom",
      taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
      agents: [
        {
          id: "custom",
          name: "Custom ACP",
          command: "/usr/local/bin/acp-agent",
          args: ["--stdio", "7"],
          cwd: null,
        },
      ],
    });
  });

  it("selects the configured default agent", () => {
    const settings = normalizeAcpAgentSettings({
      enabled: true,
      defaultAgentId: "second",
      agents: [
        {
          id: "first",
          name: "First",
          command: "first-agent",
          args: [],
          cwd: null,
        },
        {
          id: "second",
          name: "Second",
          command: "second-agent",
          args: ["--stdio"],
          cwd: "/tmp",
        },
      ],
    });

    expect(getSelectedAcpAgent(settings)).toEqual({
      id: "second",
      name: "Second",
      command: "second-agent",
      args: ["--stdio"],
      cwd: "/tmp",
    });
    expect(getSelectedAcpAgent(getDefaultAcpAgentSettings())).toBeNull();
  });

  it("creates stable task events", () => {
    expect(
      createAcpTaskEvent({
        taskId: "task-1",
        type: "status",
        status: "connecting",
        message: "正在连接 Agent",
      }),
    ).toEqual({
      taskId: "task-1",
      type: "status",
      status: "connecting",
      message: "正在连接 Agent",
    });
  });
});
