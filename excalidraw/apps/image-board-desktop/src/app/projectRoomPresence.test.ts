import { describe, expect, it } from "vitest";

import {
  createProjectRoomCollaborators,
  selectProjectRoomAgentPresence,
} from "./projectRoomPresence";

describe("selectProjectRoomAgentPresence", () => {
  it("shows one avatar per Agent actor and excludes the desktop participant", () => {
    expect(
      selectProjectRoomAgentPresence([
        {
          actorId: "corestudio:desktop",
          sessionId: "desktop",
          transport: "ipc",
          role: "desktop-editor",
          displayLabel: "CoreStudio",
        },
        {
          actorId: "codex:thread-b",
          sessionId: "board-1",
          transport: "websocket",
          role: "board-editor",
          displayLabel: "结构探索",
        },
        {
          actorId: "codex:thread-b",
          sessionId: "board-2",
          transport: "websocket",
          role: "board-editor",
          displayLabel: "结构探索",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        actorId: "codex:thread-b",
        sessionId: "board-1",
      }),
    ]);
  });

  it("shows an active agent writer when that actor has no open Agent Board", () => {
    expect(
      selectProjectRoomAgentPresence([
        {
          actorId: "codex:thread-writer",
          sessionId: "writer-1",
          transport: "command",
          role: "agent-writer",
          displayLabel: "结构探索",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        actorId: "codex:thread-writer",
        sessionId: "writer-1",
      }),
    ]);
  });

  it("feeds one identifiable Agent per actor into Excalidraw collaborators", () => {
    const collaborators = createProjectRoomCollaborators([
      {
        actorId: "codex:thread-b",
        sessionId: "writer-1",
        transport: "command",
        role: "agent-writer",
        displayLabel: "结构探索",
      },
      {
        actorId: "codex:thread-b",
        sessionId: "board-1",
        transport: "websocket",
        role: "board-editor",
        displayLabel: "结构探索",
      },
    ]);

    expect([...collaborators.entries()]).toEqual([
      [
        "board-1",
        expect.objectContaining({
          id: "codex:thread-b",
          socketId: "board-1",
          username: "Codex · 结构探索",
          avatarUrl: expect.stringMatching(/^data:image\/svg\+xml,/),
          canFollow: false,
        }),
      ],
    ]);
  });

  it("keeps each distinct Agent visible and gives fallback identities a clear label", () => {
    const collaborators = createProjectRoomCollaborators([
      {
        actorId: "codex:thread-b",
        sessionId: "board-b",
        transport: "websocket",
        role: "board-editor",
        displayLabel: "结构探索",
      },
      {
        actorId: "codex:thread-c",
        sessionId: "board-c",
        transport: "websocket",
        role: "board-editor",
        displayLabel: "Codex 019f89ff",
      },
    ]);

    expect([...collaborators.values()]).toEqual([
      expect.objectContaining({
        id: "codex:thread-b",
        username: "Codex · 结构探索",
      }),
      expect.objectContaining({
        id: "codex:thread-c",
        username: "Codex Agent · 019f89ff",
      }),
    ]);
  });
});
