import { describe, expect, it } from "vitest";

import { buildDesktopAgentActiveProjects } from "./agentActiveProjects";

const binding = {
  actorId: "agent:codex:session-a",
  sessionRef: "session-a",
  host: "codex" as const,
  displayLabel: "Codex · 工业设计",
  stableBoardId: "board-b",
  project: {
    projectId: "project-b",
    projectPath: "/projects/b",
    name: "工业设计",
    agentAccess: { token: "token-b", enabled: true },
  },
  roomId: "room-b",
  sessionEpoch: 1,
};

describe("buildDesktopAgentActiveProjects", () => {
  it("shows bound projects that are absent from recent projects and human tabs", () => {
    expect(
      buildDesktopAgentActiveProjects({
        bindings: [binding],
        getParticipants: () => null,
      }),
    ).toEqual([
      {
        projectId: "project-b",
        projectPath: "/projects/b",
        name: "工业设计",
        status: "reconnecting",
        agentCount: 1,
        agents: [
          {
            actorId: binding.actorId,
            displayLabel: binding.displayLabel,
            host: "codex",
            status: "reconnecting",
          },
        ],
      },
    ]);
  });

  it("derives connected and working status from Project Room participants", () => {
    const connected = buildDesktopAgentActiveProjects({
      bindings: [binding],
      getParticipants: () => [
        {
          actorId: binding.actorId,
          sessionId: "board-session",
          transport: "websocket",
          role: "board-editor",
          displayLabel: binding.displayLabel,
        },
      ],
    });
    const working = buildDesktopAgentActiveProjects({
      bindings: [binding],
      getParticipants: () => [
        {
          actorId: binding.actorId,
          sessionId: "writer-session",
          transport: "command",
          role: "agent-writer",
          displayLabel: binding.displayLabel,
        },
      ],
    });

    expect(connected[0]).toMatchObject({ status: "connected" });
    expect(connected[0]?.agents[0]).toMatchObject({ status: "connected" });
    expect(working[0]).toMatchObject({ status: "working" });
    expect(working[0]?.agents[0]).toMatchObject({ status: "working" });
  });
});
