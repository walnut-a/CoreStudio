import { describe, expect, it } from "vitest";

import {
  ACP_PROTOCOL_VERSION,
  createAcpTaskEvent,
  getDefaultAcpAgentSettings,
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
      }),
    ).toEqual({
      enabled: false,
      agents: [],
      defaultAgentId: null,
    });
  });

  it("keeps a valid custom agent command", () => {
    expect(
      normalizeAcpAgentSettings({
        enabled: true,
        defaultAgentId: "custom",
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
