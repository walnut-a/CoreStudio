import { describe, expect, it, vi } from "vitest";

import { createProjectRoomTicketStore } from "./projectRoomTicketStore";

const identity = {
  projectId: "project-1",
  canonicalProjectPath: "/projects/project-1",
  roomId: "room-1",
  sessionEpoch: 3,
};

describe("ProjectRoomTicketStore", () => {
  it("consumes a launch ticket once and exchanges it for a resume token", () => {
    const randomId = vi
      .fn()
      .mockReturnValueOnce("launch-ticket")
      .mockReturnValueOnce("board-session")
      .mockReturnValueOnce("resume-token");
    const store = createProjectRoomTicketStore({
      randomId,
      now: () => 1_000,
    });
    const launchTicket = store.issueLaunchTicket({
      identity,
      actorId: "codex:thread-b",
      displayLabel: "任务 B",
    });

    expect(launchTicket).toBe("launch-ticket");
    expect(store.consumeLaunchTicket(launchTicket, identity)).toEqual({
      sessionId: "board-session",
      resumeToken: "resume-token",
      participant: {
        actorId: "codex:thread-b",
        sessionId: "board-session",
        transport: "websocket",
        role: "board-editor",
        displayLabel: "任务 B",
      },
    });
    expect(() =>
      store.consumeLaunchTicket(launchTicket, identity),
    ).toThrowError(expect.objectContaining({ code: "AUTH_REQUIRED" }));
  });

  it("uses a resume token to create a fresh page session", () => {
    const randomId = vi
      .fn()
      .mockReturnValueOnce("launch-ticket")
      .mockReturnValueOnce("board-session-1")
      .mockReturnValueOnce("resume-token")
      .mockReturnValueOnce("board-session-2");
    const store = createProjectRoomTicketStore({
      randomId,
      now: () => 1_000,
    });
    const launchTicket = store.issueLaunchTicket({
      identity,
      actorId: "codex:thread-b",
      displayLabel: "任务 B",
    });
    const exchanged = store.consumeLaunchTicket(launchTicket, identity);

    expect(store.resume(exchanged.resumeToken, identity)).toEqual({
      sessionId: "board-session-2",
      resumeToken: "resume-token",
      participant: {
        actorId: "codex:thread-b",
        sessionId: "board-session-2",
        transport: "websocket",
        role: "board-editor",
        displayLabel: "任务 B",
      },
    });
  });

  it("authorizes scoped HTTP reads without creating another participant session", () => {
    const randomId = vi
      .fn()
      .mockReturnValueOnce("launch-ticket")
      .mockReturnValueOnce("board-session")
      .mockReturnValueOnce("resume-token");
    const store = createProjectRoomTicketStore({
      randomId,
      now: () => 1_000,
    });
    const launchTicket = store.issueLaunchTicket({
      identity,
      actorId: "codex:thread-b",
      displayLabel: "任务 B",
    });
    const exchange = store.consumeLaunchTicket(launchTicket, identity);

    expect(store.authorizeResumeToken(exchange.resumeToken, identity)).toEqual(
      identity,
    );
    expect(randomId).toHaveBeenCalledTimes(3);
  });

  it("rejects tickets from an old room epoch", () => {
    const store = createProjectRoomTicketStore({
      randomId: vi.fn(() => crypto.randomUUID()),
      now: () => 1_000,
    });
    const launchTicket = store.issueLaunchTicket({
      identity,
      actorId: "codex:thread-b",
      displayLabel: "任务 B",
    });

    expect(() =>
      store.consumeLaunchTicket(launchTicket, {
        ...identity,
        sessionEpoch: 4,
      }),
    ).toThrowError(expect.objectContaining({ code: "SESSION_EPOCH_EXPIRED" }));
  });

  it("expires launch and resume tokens", () => {
    let now = 1_000;
    const store = createProjectRoomTicketStore({
      randomId: vi
        .fn()
        .mockReturnValueOnce("launch-ticket")
        .mockReturnValueOnce("board-session")
        .mockReturnValueOnce("resume-token"),
      now: () => now,
      launchTicketTtlMs: 100,
      resumeTokenTtlMs: 200,
    });
    const launchTicket = store.issueLaunchTicket({
      identity,
      actorId: "codex:thread-b",
      displayLabel: "任务 B",
    });
    now = 1_101;
    expect(() =>
      store.consumeLaunchTicket(launchTicket, identity),
    ).toThrowError(expect.objectContaining({ code: "TOKEN_EXPIRED" }));
  });
});
