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

  it("maps Agent actors to Excalidraw collaborators instead of a custom presence widget", () => {
    const collaborators = createProjectRoomCollaborators([
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
        sessionId: "writer-1",
        transport: "command",
        role: "agent-writer",
        displayLabel: "结构探索",
      },
    ]);

    expect([...collaborators.entries()]).toEqual([
      [
        "board-1",
        expect.objectContaining({
          id: "codex:thread-b",
          socketId: "board-1",
          username: "结构探索",
        }),
      ],
    ]);
  });
});
