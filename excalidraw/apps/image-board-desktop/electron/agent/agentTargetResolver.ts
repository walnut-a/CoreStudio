import type { AgentProjectBindingStore } from "./agentProjectBindingStore";
import type { ProjectRoom } from "../room/projectRoom";
import type { LocalBridgeCurrentProject } from "./localBridgeServer";

const fail = (code: string, message: string): never => {
  throw Object.assign(new Error(message), { code });
};

export const createAgentTargetResolver =
  ({
    store,
    readProject,
    getRoom,
  }: {
    store: AgentProjectBindingStore;
    readProject: (projectPath: string) => Promise<{
      projectId?: string;
      stableBoardId?: string;
      name: string;
      agentAccess: { token: string; enabled: boolean };
    }>;
    getRoom: (
      projectId: string,
    ) => Pick<ProjectRoom, "identity" | "lifecycle"> | null;
  }) =>
  async (actorId: string): Promise<LocalBridgeCurrentProject | null> => {
    const binding = store.resolveByActorId(actorId);
    if (!binding) {
      return null;
    }
    // A claim is authority to one project identity, not perpetual authority to
    // whatever a path happens to contain after a folder replacement or restore.
    const manifest = await readProject(binding.project.projectPath);
    const current = store.resolveByActorId(actorId);
    if (
      !current ||
      current.stableBoardId !== binding.stableBoardId ||
      current.roomId !== binding.roomId ||
      current.sessionEpoch !== binding.sessionEpoch ||
      current.sessionRef !== binding.sessionRef
    ) {
      return fail(
        "AGENT_TARGET_REQUIRED",
        "The Agent target changed while resolving the request. Reconnect to the intended Board.",
      );
    }
    if (
      manifest.projectId !== binding.project.projectId ||
      manifest.stableBoardId !== binding.stableBoardId
    ) {
      return fail(
        "PROJECT_MISMATCH",
        "The claimed project has been replaced. Claim the intended Board again.",
      );
    }
    if (!manifest.agentAccess.enabled) {
      return fail(
        "FORBIDDEN",
        "Agent access to the claimed project is disabled.",
      );
    }
    const room = getRoom(binding.project.projectId);
    if (!room || room.lifecycle === "closed") {
      return fail(
        "ROOM_CLOSED",
        "The claimed project room has closed. Claim the Board again.",
      );
    }
    if (room.lifecycle === "closing") {
      return fail("ROOM_CLOSING", "The claimed project room is closing.");
    }
    if (
      room.identity.roomId !== binding.roomId ||
      room.identity.sessionEpoch !== binding.sessionEpoch ||
      room.identity.canonicalProjectPath !== binding.project.projectPath
    ) {
      return fail(
        "SESSION_EPOCH_EXPIRED",
        "The claimed project room identity has changed. Claim the Board again.",
      );
    }
    return {
      projectPath: room.identity.canonicalProjectPath,
      name: manifest.name,
      agentAccess: { ...manifest.agentAccess },
      agentRoomId: room.identity.roomId,
      agentActorId: binding.actorId,
    };
  };
