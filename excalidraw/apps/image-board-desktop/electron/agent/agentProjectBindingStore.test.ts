import { describe, expect, it } from "vitest";

import { createAgentProjectBindingStore } from "./agentProjectBindingStore";

describe("createAgentProjectBindingStore", () => {
  it("binds one Agent actor to the stable Board project independently of desktop focus", () => {
    const store = createAgentProjectBindingStore();

    store.bind({
      actorId: "agent:codex:session-a",
      sessionRef: "session-a",
      host: "codex",
      displayLabel: "Codex · 工业设计",
      stableBoardId: "board-project-b",
      project: {
        projectId: "project-b",
        projectPath: "/Users/alice/CoreStudio/project-b",
        name: "工业设计",
        agentAccess: { token: "project-b-token", enabled: true },
      },
      roomId: "room-project-b",
      sessionEpoch: 3,
    });

    expect(store.resolveByActorId("agent:codex:session-a")).toEqual({
      actorId: "agent:codex:session-a",
      sessionRef: "session-a",
      host: "codex",
      displayLabel: "Codex · 工业设计",
      stableBoardId: "board-project-b",
      project: {
        projectId: "project-b",
        projectPath: "/Users/alice/CoreStudio/project-b",
        name: "工业设计",
        agentAccess: { token: "project-b-token", enabled: true },
      },
      roomId: "room-project-b",
      sessionEpoch: 3,
    });
  });

  it("replaces an actor binding atomically when the conversation claims another Board", () => {
    const store = createAgentProjectBindingStore();
    const common = {
      actorId: "agent:cursor:session-a",
      sessionRef: "session-a",
      host: "cursor" as const,
      displayLabel: "Cursor · 方案整理",
      roomId: "room-a",
      sessionEpoch: 1,
    };

    store.bind({
      ...common,
      stableBoardId: "board-a",
      project: {
        projectId: "project-a",
        projectPath: "/projects/a",
        name: "A",
        agentAccess: { token: "token-a", enabled: true },
      },
    });
    store.bind({
      ...common,
      stableBoardId: "board-b",
      project: {
        projectId: "project-b",
        projectPath: "/projects/b",
        name: "B",
        agentAccess: { token: "token-b", enabled: true },
      },
      roomId: "room-b",
      sessionEpoch: 2,
    });

    expect(store.list()).toHaveLength(1);
    expect(store.resolveBySessionRef("session-a")?.project.projectId).toBe(
      "project-b",
    );
  });

  it("returns defensive snapshots and can release a disconnected Agent", () => {
    const store = createAgentProjectBindingStore();
    store.bind({
      actorId: "agent:claude-code:session-a",
      sessionRef: "session-a",
      host: "claude-code",
      displayLabel: "Claude Code Agent",
      stableBoardId: "board-a",
      project: {
        projectId: "project-a",
        projectPath: "/projects/a",
        name: "A",
        agentAccess: { token: "token-a", enabled: true },
      },
      roomId: "room-a",
      sessionEpoch: 1,
    });

    const snapshot = store.list();
    snapshot[0]!.project.name = "mutated";
    expect(
      store.resolveByActorId("agent:claude-code:session-a")?.project.name,
    ).toBe("A");

    expect(store.releaseByActorId("agent:claude-code:session-a")).toBe(true);
    expect(store.list()).toEqual([]);
  });
});
