import { describe, expect, it } from "vitest";

import { createLocalAgentSessionStore } from "./localAgentSessionStore";

describe("localAgentSessionStore", () => {
  it("issues isolated runtime sessions for supported local Agent hosts", () => {
    const ids = ["cursor-session", "claude-session"];
    const store = createLocalAgentSessionStore({
      randomId: () => ids.shift() ?? "unexpected-session",
      now: () => 1_754_000_000_000,
    });

    const cursor = store.issue({
      host: "cursor",
      displayLabel: "Cursor · 方案 A",
    });
    const claude = store.issue({
      host: "claude-code",
      displayLabel: "Claude Code · 方案 B",
    });

    expect(cursor).toEqual({
      sessionRef: "cursor-session",
      actorId: "agent:cursor:cursor-session",
      host: "cursor",
      displayLabel: "Cursor · 方案 A",
      issuedAt: "2025-07-31T22:13:20.000Z",
    });
    expect(claude.actorId).toBe("agent:claude-code:claude-session");
    expect(store.resolve(cursor.sessionRef)).toEqual(cursor);
    expect(store.resolve(claude.sessionRef)).toEqual(claude);
  });

  it("rejects unsupported hosts and unknown session references", () => {
    const store = createLocalAgentSessionStore();

    try {
      store.issue({ host: "remote-agent", displayLabel: "Remote" });
      throw new Error("expected unsupported host to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "BAD_REQUEST" });
    }
    try {
      store.resolve("missing-session");
      throw new Error("expected unknown session to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "AUTH_REQUIRED" });
    }
  });

  it("does not allow empty or duplicate runtime session references", () => {
    const ids = ["session-a", "session-a"];
    const store = createLocalAgentSessionStore({
      randomId: () => ids.shift() ?? "",
    });

    store.issue({ host: "cursor", displayLabel: "Cursor" });
    try {
      store.issue({ host: "claude-code", displayLabel: "Claude Code" });
      throw new Error("expected duplicate session to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "COMMAND_FAILED" });
    }
  });

  it("invalidates every previous session when CoreStudio creates a new runtime store", () => {
    const previousRuntime = createLocalAgentSessionStore({
      randomId: () => "previous-runtime-session",
    });
    const previousSession = previousRuntime.issue({
      host: "cursor",
      displayLabel: "Cursor · 旧对话",
    });
    const restartedRuntime = createLocalAgentSessionStore({
      randomId: () => "new-runtime-session",
    });

    expect(() => restartedRuntime.resolve(previousSession.sessionRef)).toThrow(
      expect.objectContaining({ code: "AUTH_REQUIRED" }),
    );
  });
});
