import { describe, expect, it, vi } from "vitest";
import { ProjectRoom } from "../room/projectRoom";
import { createAgentProjectLifecycle } from "./agentProjectLifecycle";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const harness = () => {
  const projects = ["a", "b"].map((id) => ({
    projectId: id,
    projectPath: `/projects/${id}`,
    name: id,
    stableBoardId: `board-${id}`,
    agentAccess: { token: id, enabled: true },
  }));
  const rooms = projects.map(
    (project) =>
      new ProjectRoom({
        identity: {
          projectId: project.projectId,
          canonicalProjectPath: project.projectPath,
          roomId: `room-${project.projectId}`,
          sessionEpoch: 1,
        },
        initialScene: { elements: [], sharedSceneConfig: {} },
        persistedSequence: 0,
        projectRevision: "initial",
      }),
  );
  const changed = vi.fn();
  const claimPage = vi.fn();
  const lookup = vi.fn(
    async (id: string) => projects.find((p) => p.stableBoardId === id) ?? null,
  );
  const openRoom = vi.fn(
    async (p: string) =>
      rooms.find((r) => r.identity.canonicalProjectPath === p)!,
  );
  const readProject = vi.fn(
    async (p: string) => projects.find((project) => project.projectPath === p)!,
  );
  const lifecycle = createAgentProjectLifecycle({
    getProjectByStableBoardId: lookup,
    openRoom,
    getRoom: (id) => rooms.find((r) => r.identity.projectId === id) ?? null,
    readProject,
    claimPage,
    onChanged: changed,
  });
  const claim = (board: string, actorId = "agent:a") =>
    lifecycle.claim({
      actorId,
      sessionRef: actorId,
      displayLabel: actorId,
      stableBoardId: `board-${board}`,
      pageNonce: `page-${board}`,
    });
  lifecycle.start();
  return {
    lifecycle,
    projects,
    rooms,
    lookup,
    openRoom,
    readProject,
    changed,
    claimPage,
    claim,
  };
};

describe("Agent project lifecycle", () => {
  it("rejects target resolution from a stopped Bridge even if the same target is reclaimed", async () => {
    const h = harness();
    await h.claim("a");
    const pending = deferred<typeof h.projects[number]>();
    h.readProject.mockImplementationOnce(() => pending.promise);
    const resolving = h.lifecycle.resolveTarget("agent:a");
    h.lifecycle.stop();
    h.lifecycle.start();
    await h.claim("a");
    pending.resolve(h.projects[0]);
    await expect(resolving).rejects.toMatchObject({
      code: "AGENT_TARGET_REQUIRED",
    });
    await expect(h.lifecycle.resolveTarget("agent:a")).resolves.toMatchObject({
      name: "a",
    });
    h.lifecycle.stop();
  });

  it("keeps the latest claim when earlier project lookup finishes late", async () => {
    const h = harness();
    const pending = deferred<typeof h.projects[number] | null>();
    h.lookup.mockImplementationOnce(() => pending.promise);
    const first = h.claim("a");
    await h.claim("b");
    pending.resolve(h.projects[0]);
    await expect(first).rejects.toMatchObject({
      code: "AGENT_TARGET_REQUIRED",
    });
    expect(h.lifecycle.listBindings()).toMatchObject([
      { stableBoardId: "board-b" },
    ]);
    expect(h.claimPage).toHaveBeenCalledTimes(1);
    h.lifecycle.stop();
  });

  it("does not resurrect a binding or subscription after stop and restart", async () => {
    const h = harness();
    const pending = deferred<ProjectRoom>();
    h.openRoom.mockImplementationOnce(() => pending.promise);
    const first = h.claim("a");
    await vi.waitFor(() => expect(h.openRoom).toHaveBeenCalledTimes(1));
    h.lifecycle.stop();
    h.lifecycle.start();
    await h.claim("b");
    pending.resolve(h.rooms[0]);
    await expect(first).rejects.toMatchObject({
      code: "AGENT_TARGET_REQUIRED",
    });
    expect(h.lifecycle.listBindings()).toMatchObject([
      { stableBoardId: "board-b" },
    ]);
    h.changed.mockClear();
    h.rooms[0].close("project-closed");
    expect(h.changed).not.toHaveBeenCalled();
    h.lifecycle.stop();
  });

  it("clears only bindings belonging to the room that closes", async () => {
    const h = harness();
    await h.claim("a");
    await h.claim("a", "agent:second");
    await h.claim("b", "agent:third");
    h.rooms[0].close("project-closed");
    expect(h.lifecycle.listBindings()).toMatchObject([
      { actorId: "agent:third" },
    ]);
    await expect(h.lifecycle.resolveTarget("agent:a")).resolves.toBeNull();
    await expect(
      h.lifecycle.resolveTarget("agent:third"),
    ).resolves.toMatchObject({ name: "b" });
    h.lifecycle.stop();
  });

  it("owns one subscription per room and clears it on repeated stop", async () => {
    const h = harness();
    const subscribe = vi.spyOn(h.rooms[0], "subscribe");
    await h.claim("a");
    h.lifecycle.start();
    await h.claim("a", "agent:second");
    h.lifecycle.observeRoom(h.rooms[0]);
    expect(subscribe).toHaveBeenCalledTimes(1);
    h.lifecycle.stop();
    h.lifecycle.stop();
    expect(h.lifecycle.listBindings()).toEqual([]);
    h.changed.mockClear();
    h.rooms[0].close("project-closed");
    expect(h.changed).not.toHaveBeenCalled();
    await expect(h.claim("a")).rejects.toMatchObject({
      code: "AGENT_TARGET_REQUIRED",
    });
  });

  it("does not replace a good binding when page claim validation fails", async () => {
    const h = harness();
    await h.claim("a");
    h.claimPage.mockImplementationOnce(() => {
      throw Object.assign(new Error("wrong page"), {
        code: "PROJECT_MISMATCH",
      });
    });
    await expect(h.claim("b")).rejects.toMatchObject({
      code: "PROJECT_MISMATCH",
    });
    expect(h.lifecycle.listBindings()).toMatchObject([
      { stableBoardId: "board-a" },
    ]);
    h.lifecycle.stop();
  });
});
