import { describe, expect, it, vi } from "vitest";

import { createDesktopProjectRoomTransport } from "./desktopProjectRoomTransport";

describe("createDesktopProjectRoomTransport", () => {
  it("binds desktop bridge operations and filters events by session", async () => {
    let eventListener:
      | ((sessionId: string, event: { type: "scene.persisted" }) => void)
      | undefined;
    const bridge = {
      joinProjectRoom: vi.fn(async (input) => ({ input })),
      submitProjectRoomOperation: vi.fn(async (input) => ({ input })),
      leaveProjectRoom: vi.fn(async () => true),
      onProjectRoomEvent: vi.fn((listener) => {
        eventListener = listener;
        return vi.fn();
      }),
    };
    const transport = createDesktopProjectRoomTransport({
      bridge: bridge as any,
      sessionId: "desktop-session",
    });
    const listener = vi.fn();
    transport.subscribe(listener);

    await transport.join({
      projectPath: "/projects/project-1",
      sessionId: "desktop-session",
    });
    await transport.submitOperation({
      projectId: "project-1",
      canonicalProjectPath: "/projects/project-1",
      roomId: "room-1",
      sessionEpoch: 1,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [],
      final: true,
    });
    eventListener?.("another-session", { type: "scene.persisted" });
    eventListener?.("desktop-session", { type: "scene.persisted" });

    expect(bridge.submitProjectRoomOperation).toHaveBeenCalledWith({
      sessionId: "desktop-session",
      operation: expect.objectContaining({ operationId: "operation-1" }),
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reports unavailable room IPC explicitly", async () => {
    const transport = createDesktopProjectRoomTransport({
      bridge: {} as any,
      sessionId: "desktop-session",
    });

    await expect(
      transport.join({
        projectPath: "/projects/project-1",
        sessionId: "desktop-session",
      }),
    ).rejects.toMatchObject({ code: "ROOM_TRANSPORT_UNAVAILABLE" });
  });
});
