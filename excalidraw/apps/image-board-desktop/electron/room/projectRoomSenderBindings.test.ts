import { describe, expect, it, vi } from "vitest";

import { createProjectRoomSenderBindings } from "./projectRoomSenderBindings";

describe("project room sender bindings", () => {
  it("binds a room session to one registered project renderer", () => {
    const requireProjectSender = vi.fn();
    const bindings = createProjectRoomSenderBindings({
      requireProjectSender,
    });

    bindings.bind({
      sessionId: "session-a",
      senderId: 11,
      projectPath: "/projects/a",
    });

    expect(requireProjectSender).toHaveBeenCalledWith(11, "/projects/a");
    expect(bindings.requireSession(11, "session-a")).toEqual({
      sessionId: "session-a",
      senderId: 11,
      projectPath: "/projects/a",
    });
  });

  it("rejects another renderer reusing a project room session", () => {
    const bindings = createProjectRoomSenderBindings({
      requireProjectSender: vi.fn(),
    });
    bindings.bind({
      sessionId: "session-a",
      senderId: 11,
      projectPath: "/projects/a",
    });

    expect(() => bindings.requireSession(12, "session-a")).toThrow(
      expect.objectContaining({ code: "PROJECT_MISMATCH" }),
    );
    expect(() =>
      bindings.bind({
        sessionId: "session-a",
        senderId: 12,
        projectPath: "/projects/b",
      }),
    ).toThrow(expect.objectContaining({ code: "PROJECT_MISMATCH" }));
  });

  it("removes only sessions owned by the destroyed renderer", () => {
    const bindings = createProjectRoomSenderBindings({
      requireProjectSender: vi.fn(),
    });
    bindings.bind({
      sessionId: "session-a",
      senderId: 11,
      projectPath: "/projects/a",
    });
    bindings.bind({
      sessionId: "session-b",
      senderId: 12,
      projectPath: "/projects/b",
    });

    expect(bindings.removeSender(11)).toEqual(["session-a"]);
    expect(() => bindings.requireSession(11, "session-a")).toThrow(
      expect.objectContaining({ code: "PROJECT_SESSION_REQUIRED" }),
    );
    expect(bindings.requireSession(12, "session-b").projectPath).toBe(
      "/projects/b",
    );
  });

  it("allows the owning renderer to leave and invalidates the session", () => {
    const bindings = createProjectRoomSenderBindings({
      requireProjectSender: vi.fn(),
    });
    bindings.bind({
      sessionId: "session-a",
      senderId: 11,
      projectPath: "/projects/a",
    });

    expect(bindings.removeSession(11, "session-a")).toBe(true);
    expect(() => bindings.requireSession(11, "session-a")).toThrow(
      expect.objectContaining({ code: "PROJECT_SESSION_REQUIRED" }),
    );
  });
});
