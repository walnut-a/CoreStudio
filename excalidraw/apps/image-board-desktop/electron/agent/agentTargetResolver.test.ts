import { describe, expect, it, vi } from "vitest";
import { createAgentProjectBindingStore } from "./agentProjectBindingStore";
import { createAgentTargetResolver } from "./agentTargetResolver";

const harness = () => {
  const store = createAgentProjectBindingStore();
  const project = {
    projectId: "project-b",
    projectPath: "/projects/b",
    name: "B",
    agentAccess: { token: "b-token", enabled: true },
  };
  const binding = {
    actorId: "agent:b",
    sessionRef: "session-b",
    displayLabel: "B",
    stableBoardId: "board-b",
    project,
    roomId: "room-b",
    sessionEpoch: 2,
  };
  store.bind(binding);
  const readProject = vi.fn(async () => ({
    ...project,
    stableBoardId: "board-b",
  }));
  const getRoom = vi.fn(() => ({
    identity: {
      projectId: project.projectId,
      canonicalProjectPath: project.projectPath,
      roomId: binding.roomId,
      sessionEpoch: binding.sessionEpoch,
    },
    lifecycle: "active" as const,
  }));
  return {
    store,
    binding,
    readProject,
    getRoom,
    resolve: createAgentTargetResolver({ store, readProject, getRoom }),
  };
};

describe("Agent target resolution", () => {
  it("uses the bound project and current manifest without a desktop target", async () => {
    const h = harness();
    await expect(h.resolve("agent:b")).resolves.toMatchObject({
      projectPath: "/projects/b",
      agentRoomId: "room-b",
      agentActorId: "agent:b",
    });
    expect(h.readProject).toHaveBeenCalledWith("/projects/b");
    await expect(h.resolve("unbound")).resolves.toBeNull();
  });

  it.each([{ projectId: "replacement" }, { stableBoardId: "replacement" }])(
    "rejects a replaced project manifest: %j",
    async (change) => {
      const h = harness();
      h.readProject.mockResolvedValue({
        ...h.binding.project,
        stableBoardId: "board-b",
        ...change,
      });
      await expect(h.resolve("agent:b")).rejects.toMatchObject({
        code: "PROJECT_MISMATCH",
      });
    },
  );

  it("rejects a new room epoch even when the project path is unchanged", async () => {
    const h = harness();
    const room = h.getRoom();
    h.getRoom.mockReturnValue({
      ...room,
      identity: { ...room.identity, sessionEpoch: 3 },
    });
    await expect(h.resolve("agent:b")).rejects.toMatchObject({
      code: "SESSION_EPOCH_EXPIRED",
    });
  });

  it("rejects revoked project access", async () => {
    const h = harness();
    h.readProject.mockResolvedValue({
      ...h.binding.project,
      stableBoardId: "board-b",
      agentAccess: { token: "b-token", enabled: false },
    });
    await expect(h.resolve("agent:b")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("does not use a stale binding if another Board is claimed while reading", async () => {
    const h = harness();
    h.readProject.mockImplementation(async () => {
      h.store.bind({ ...h.binding, stableBoardId: "board-c" });
      return { ...h.binding.project, stableBoardId: "board-b" };
    });
    await expect(h.resolve("agent:b")).rejects.toMatchObject({
      code: "AGENT_TARGET_REQUIRED",
    });
  });
});
