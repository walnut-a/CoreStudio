import type { ProjectRoom } from "../room/projectRoom";
import {
  createAgentProjectBindingStore,
  type AgentBoundProject,
  type AgentProjectBinding,
} from "./agentProjectBindingStore";
import { createAgentTargetResolver } from "./agentTargetResolver";

type ClaimInput = Pick<
  AgentProjectBinding,
  "actorId" | "sessionRef" | "host" | "displayLabel" | "stableBoardId"
> & { pageNonce: string };

/** CoreStudio-owned state. Desktop views and the Excalidraw canvas do not own it. */
export const createAgentProjectLifecycle = (input: {
  getProjectByStableBoardId: (
    id: string,
  ) => Promise<Omit<AgentBoundProject, "projectId"> | null>;
  openRoom: (projectPath: string) => Promise<ProjectRoom>;
  getRoom: (projectId: string) => ProjectRoom | null;
  readProject: Parameters<typeof createAgentTargetResolver>[0]["readProject"];
  claimPage: (input: ClaimInput) => void;
  onChanged: () => void;
}) => {
  const bindings = createAgentProjectBindingStore();
  const subscriptions = new Map<string, () => void>();
  const pendingClaims = new Map<string, symbol>();
  const resolveTarget = createAgentTargetResolver({
    store: bindings,
    readProject: input.readProject,
    getRoom: input.getRoom,
  });
  let active = false;
  let bridgeGeneration = Symbol();

  const assertCurrent = (actorId: string, claim: symbol) => {
    if (!active || pendingClaims.get(actorId) !== claim) {
      throw Object.assign(
        new Error(
          "The Agent claim was superseded or its Bridge stopped. Claim the intended Board again.",
        ),
        { code: "AGENT_TARGET_REQUIRED" },
      );
    }
  };
  const observeRoom = (room: ProjectRoom) => {
    if (
      !active ||
      room.lifecycle === "closed" ||
      subscriptions.has(room.identity.roomId)
    )
      return;
    const unsubscribe = room.subscribe((event) => {
      if (event.type === "room.closed") {
        for (const binding of bindings.list()) {
          if (binding.roomId === room.identity.roomId)
            bindings.releaseByActorId(binding.actorId);
        }
        subscriptions.delete(room.identity.roomId);
        unsubscribe();
      }
      input.onChanged();
    });
    subscriptions.set(room.identity.roomId, unsubscribe);
  };

  return {
    start() {
      active = true;
    },
    stop() {
      if (!active) return;
      active = false;
      bridgeGeneration = Symbol();
      pendingClaims.clear();
      bindings.clear();
      for (const unsubscribe of subscriptions.values()) unsubscribe();
      subscriptions.clear();
      input.onChanged();
    },
    observeRoom,
    listBindings: () => bindings.list(),
    async resolveTarget(actorId: string) {
      if (!active) return null;
      const generation = bridgeGeneration;
      const target = await resolveTarget(actorId);
      if (!active || generation !== bridgeGeneration) {
        throw Object.assign(
          new Error(
            "The Agent Bridge stopped while resolving this request. Reconnect to the intended Board.",
          ),
          { code: "AGENT_TARGET_REQUIRED" },
        );
      }
      return target;
    },
    async claim(claimInput: ClaimInput) {
      const claim = Symbol();
      if (active) pendingClaims.set(claimInput.actorId, claim);
      try {
        assertCurrent(claimInput.actorId, claim);
        const project = await input.getProjectByStableBoardId(
          claimInput.stableBoardId,
        );
        assertCurrent(claimInput.actorId, claim);
        if (!project)
          throw Object.assign(
            new Error("The stable Agent Board project could not be found."),
            {
              code: "PROJECT_REQUIRED",
              details: { stableBoardId: claimInput.stableBoardId },
            },
          );
        const room = await input.openRoom(project.projectPath);
        assertCurrent(claimInput.actorId, claim);
        if (room.lifecycle === "closed" || room.lifecycle === "closing")
          throw Object.assign(
            new Error("The target project room has closed."),
            { code: "ROOM_CLOSED" },
          );
        // All asynchronous work is above this point. Page authority and target
        // binding commit together; a rejected page cannot replace a good target.
        input.claimPage(claimInput);
        const { pageNonce: _pageNonce, ...bindingIdentity } = claimInput;
        bindings.bind({
          ...bindingIdentity,
          project: {
            ...project,
            projectPath: room.identity.canonicalProjectPath,
            projectId: room.identity.projectId,
          },
          roomId: room.identity.roomId,
          sessionEpoch: room.identity.sessionEpoch,
        });
        observeRoom(room);
        input.onChanged();
      } finally {
        if (pendingClaims.get(claimInput.actorId) === claim)
          pendingClaims.delete(claimInput.actorId);
      }
    },
  };
};
